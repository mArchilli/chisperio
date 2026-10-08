// Solo datos públicos. Nunca se conecta a la base de producción.
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { backup, DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://chisperio.com.ar';
const privateRoot = path.join(root, 'storage/app/private');
const importsRoot = path.join(privateRoot, 'catalog-imports');
const localDatabase = path.join(root, 'database/database.sqlite');
const stamp = () => new Date().toISOString().replaceAll(':', '-');
const sqlDate = (value) => value == null ? null : new Date(value).toISOString().slice(0, 19).replace('T', ' ');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function within(base, candidate) {
    const relative = path.relative(base, candidate);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function mapLimited(items, callback) {
    let next = 0;
    const result = new Array(items.length);
    await Promise.all([0, 1].map(async () => {
        while (next < items.length) {
            const index = next++;
            result[index] = await callback(items[index], index);
        }
    }));
    return result;
}

async function request(route) {
    const url = new URL(route, origin);
    assert(url.origin === origin, 'La descarga debe pertenecer al sitio público de Chisperío.');
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { Accept: url.pathname.startsWith('/api/') ? 'application/json' : 'text/html', 'User-Agent': 'Chisperio-Local-Catalog/1.0' },
                signal: AbortSignal.timeout(120_000),
            });
            assert(response.ok && new URL(response.url).origin === origin, `${url.pathname}: HTTP ${response.status}`);
            return response;
        } catch (error) {
            if (attempt === 2) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}

async function page(route) {
    const html = await (await request(route)).text();
    const encoded = html.match(/data-page="([^"]+)"/)?.[1];
    assert(encoded, `${route}: no se encontró la página Inertia.`);
    return JSON.parse(encoded.replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}

async function listing(route) {
    const first = await page(route);
    const rows = [...first.props.productos.data];
    for (let number = 2; number <= first.props.productos.last_page; number++) {
        const url = new URL(route, origin);
        url.searchParams.set('page', number);
        rows.push(...(await page(url)).props.productos.data);
    }
    assert(rows.length === first.props.productos.total, 'El catálogo cambió durante la paginación. Repetí la descarga.');
    assert(new Set(rows.map(row => row.id)).size === rows.length, 'Hay IDs repetidos en el catálogo.');
    return { props: first.props, rows };
}

function mediaPath(relative) {
    assert(typeof relative === 'string' && !relative.includes('\\') && !relative.includes('%'), 'Ruta de archivo no válida.');
    assert(/^(productos|combos)\/(img|videos)\/[^/]+\.(jpe?g|png|webp|gif|avif|mp4|webm|mov)$/i.test(relative), `Ruta no admitida: ${relative}`);
    const absolute = path.resolve(root, 'public', relative);
    assert(within(path.join(root, 'public'), absolute), 'El archivo sale del directorio público.');
    return absolute;
}

async function hashFile(file) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest('hex');
}

function allMedia(snapshot) {
    const media = snapshot.products.flatMap(product => [...product.imagenes, ...product.videos]);
    media.push(...snapshot.combos.flatMap(combo => [...combo.imagenes, ...combo.videos]));
    return [...new Map(media.map(item => [item.ruta, item])).values()];
}

async function downloadSnapshot() {
    const directory = path.join(importsRoot, stamp());
    await mkdir(directory, { recursive: true });
    const catalog = await listing('/tienda');
    const combos = await listing('/tienda?filter=combos');
    const home = (await page('/')).props;
    const snapshot = {
        version: 1, origin, fetchedAt: new Date().toISOString(),
        categories: catalog.props.categorias,
        products: await mapLimited(catalog.rows, async item => (await page(`/tienda/${item.id}`)).props.producto),
        combos: await mapLimited(combos.rows, async item => (await page(`/tienda/combos/${item.id}`)).props.combo),
        featuredIds: home.productosDestacados.map(product => product.id),
        reviews: home.resenas,
        paymentPlans: catalog.props.planesPagoTarjeta,
        freeShippingMinimum: catalog.props.configuracionEnvio.montoMinimo,
        priceChecks: [], assets: [],
    };
    assert(snapshot.products.length > 0, 'La descarga está vacía. No se puede reemplazar el catálogo.');
    // Compara precios reales del servicio: base de cada producto y opciones representativas.
    const routes = snapshot.products.map(product => `/api/productos/${product.id}/precio?cantidad=1`);
    for (const product of snapshot.products.filter(item => item.oferta_vigente || item.addons.length || item.id === 6)) {
        for (const tier of product.escalas_precio) routes.push(`/api/productos/${product.id}/precio?cantidad=${tier.cantidad_minima}`);
        const custom = product.variantes.find(variant => variant.es_color_personalizado);
        if (custom) routes.push(`/api/productos/${product.id}/precio?cantidad=3&variante_id=${custom.id}&addon_ids[]=${product.addons[0].id}`);
    }
    snapshot.priceChecks = await mapLimited(routes, async route => ({ route, expected: await (await request(route)).json() }));
    const media = allMedia(snapshot);
    console.log(`Catálogo: ${snapshot.products.length} productos, ${snapshot.combos.length} combos. Descargando ${media.length} archivos…`);
    await mapLimited(media, async (item, index) => {
        mediaPath(item.ruta);
        const target = path.join(directory, 'files', item.ruta);
        await mkdir(path.dirname(target), { recursive: true });
        const response = await request(`/${item.ruta}`);
        const type = response.headers.get('content-type') || '';
        assert(/^(image\/|video\/|application\/octet-stream)/i.test(type), `Contenido inesperado: ${item.ruta} (${type})`);
        await pipeline(Readable.fromWeb(response.body), createWriteStream(`${target}.download`, { flags: 'wx' }));
        await rename(`${target}.download`, target);
        const bytes = (await stat(target)).size;
        assert(bytes > 0, `Archivo vacío: ${item.ruta}`);
        snapshot.assets.push({ path: item.ruta, bytes, sha256: await hashFile(target) });
        if ((index + 1) % 10 === 0) console.log(`Archivos descargados: ${index + 1}/${media.length}`);
    });
    // Evita aplicar una mezcla de versiones si editaron productos durante la descarga.
    const latest = await listing('/tienda');
    const signature = rows => JSON.stringify(rows.map(item => [item.id, item.updated_at, item.precio]).sort((a, b) => a[0] - b[0]));
    assert(signature(catalog.rows) === signature(latest.rows), 'Los productos cambiaron durante la descarga. Repetí snapshot.');
    snapshot.assets.sort((a, b) => a.path.localeCompare(b.path));
    const target = path.join(directory, 'catalog.json');
    await writeFile(target, JSON.stringify(snapshot, null, 2));
    console.log(`Snapshot: ${target}`);
    console.log(`Archivos: ${(snapshot.assets.reduce((sum, item) => sum + item.bytes, 0) / 1024 / 1024).toFixed(1)} MB`);
}

async function readSnapshot(file) {
    const absolute = path.resolve(file || '');
    assert(within(importsRoot, absolute) && path.basename(absolute) === 'catalog.json', 'Usá un catalog.json dentro de storage/app/private/catalog-imports.');
    const snapshot = JSON.parse(await readFile(absolute, 'utf8'));
    assert(snapshot.version === 1 && snapshot.origin === origin && snapshot.products.length > 0, 'Snapshot no válido.');
    const expected = new Set(allMedia(snapshot).map(item => item.ruta));
    assert(snapshot.assets.length === expected.size, 'El snapshot no contiene todos los archivos.');
    const seen = new Set();
    for (const asset of snapshot.assets) {
        mediaPath(asset.path);
        assert(expected.has(asset.path) && !seen.has(asset.path), 'Archivo inesperado o repetido.');
        seen.add(asset.path);
        const source = path.join(path.dirname(absolute), 'files', asset.path);
        assert((await stat(source)).size === asset.bytes && await hashFile(source) === asset.sha256, `Archivo modificado o incompleto: ${asset.path}`);
    }
    return { snapshot, file: absolute };
}

async function assertLocalEnvironment() {
    const env = await readFile(path.join(root, '.env'), 'utf8');
    const get = key => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^['"]|['"]$/g, '');
    assert(get('APP_ENV') === 'local' && get('DB_CONNECTION') === 'sqlite', 'Este comando solo admite APP_ENV=local y DB_CONNECTION=sqlite.');
    const configured = get('DB_DATABASE');
    assert(!configured || path.resolve(root, configured) === localDatabase, 'DB_DATABASE debe ser database/database.sqlite.');
    assert(!process.env.APP_ENV || process.env.APP_ENV === 'local', 'APP_ENV del proceso no es local.');
    await access(localDatabase);
}

const deleteOrder = [
    'combo_media', 'combo_productos', 'combos', 'producto_media', 'producto_addon', 'ofertas',
    'producto_escalas_precio', 'producto_variantes', 'addons', 'producto_subcategoria',
    'categoria_producto', 'productos', 'subcategorias', 'categorias',
    'resenas', 'planes_pago_tarjeta', 'configuracion_envio',
];

function assertDisposableCatalog(db) {
    for (const table of ['pedidos', 'pedido_items', 'movimientos_stock']) {
        assert(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n === 0,
            `Hay registros en ${table}. Se cancela para preservar pedidos e historial locales.`);
    }
    for (const table of deleteOrder) assert(db.prepare(`PRAGMA table_info(${table})`).all().length > 0, `Falta migrar la tabla ${table}.`);
}

function replaceCatalog(db, snapshot) {
    db.exec('PRAGMA foreign_keys = ON; BEGIN IMMEDIATE');
    try {
        assertDisposableCatalog(db);
        const now = sqlDate(snapshot.fetchedAt);
        const insert = (table, data) => {
            const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name);
            const row = { created_at: now, updated_at: now, ...data };
            const keys = columns.filter(column => row[column] !== undefined);
            const values = keys.map(key => {
                const value = row[key];
                if (typeof value === 'boolean') return Number(value);
                if (value != null && (key.endsWith('_at') || key.endsWith('fecha_inicio') || key.endsWith('fecha_fin'))) return sqlDate(value);
                return value;
            });
            db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...values);
        };
        for (const table of deleteOrder) db.exec(`DELETE FROM ${table}`);
        for (const category of snapshot.categories) {
            insert('categorias', category);
            for (const subcategory of category.subcategorias) insert('subcategorias', subcategory);
        }
        const addons = new Map();
        for (const product of snapshot.products) {
            insert('productos', product);
            for (const category of product.categorias) insert('categoria_producto', { categoria_id: category.id, producto_id: product.id });
            for (const subcategory of product.subcategorias) insert('producto_subcategoria', { subcategoria_id: subcategory.id, producto_id: product.id });
            for (const variant of product.variantes) insert('producto_variantes', variant);
            for (const tier of product.escalas_precio) insert('producto_escalas_precio', { ...tier, producto_id: product.id });
            for (const medium of [...product.imagenes, ...product.videos]) insert('producto_media', medium);
            if (product.oferta_vigente) insert('ofertas', product.oferta_vigente);
            for (const addon of product.addons) {
                if (!addons.has(addon.id)) {
                    insert('addons', addon);
                    addons.set(addon.id, addon);
                }
                insert('producto_addon', addon.pivot);
            }
        }
        for (const combo of snapshot.combos) {
            // stock es calculado por Laravel; insert() solo copia columnas existentes.
            insert('combos', combo);
            for (const item of combo.items) insert('combo_productos', item);
            for (const medium of [...combo.imagenes, ...combo.videos]) insert('combo_media', medium);
        }
        for (const review of snapshot.reviews) insert('resenas', { ...review, is_active: true });
        snapshot.paymentPlans.forEach((plan, index) => insert('planes_pago_tarjeta', { ...plan, orden: index, is_active: true }));
        insert('configuracion_envio', { id: 1, monto_minimo: snapshot.freeShippingMinimum });
        assert(db.prepare('PRAGMA foreign_key_check').all().length === 0, 'Se detectaron referencias inválidas.');
        assert(db.prepare('PRAGMA quick_check').get().quick_check === 'ok', 'La base no pasó quick_check.');
        db.exec('COMMIT');
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}

async function stage(snapshotFile) {
    await assertLocalEnvironment();
    const { snapshot, file } = await readSnapshot(snapshotFile);
    const stageFile = path.join(path.dirname(file), `preview-${stamp()}.sqlite`);
    const original = new DatabaseSync(localDatabase, { readOnly: true });
    try {
        assertDisposableCatalog(original);
        await backup(original, stageFile);
    } finally { original.close(); }
    const db = new DatabaseSync(stageFile);
    try { replaceCatalog(db, snapshot); } finally { db.close(); }
    await writeFile(path.join(path.dirname(file), 'staged.json'), JSON.stringify({ snapshotSha256: await hashFile(file), stageFile }, null, 2));
    console.log(`Copia para revisar: ${stageFile}`);
}

async function apply(snapshotFile) {
    await assertLocalEnvironment();
    const { snapshot, file } = await readSnapshot(snapshotFile);
    const staged = JSON.parse(await readFile(path.join(path.dirname(file), 'staged.json'), 'utf8'));
    assert(staged.snapshotSha256 === await hashFile(file) && within(path.dirname(file), staged.stageFile), 'Primero ejecutá stage para este snapshot.');
    await access(staged.stageFile);
    const db = new DatabaseSync(localDatabase);
    try {
        assertDisposableCatalog(db);
        const backups = path.join(privateRoot, 'backups');
        await mkdir(backups, { recursive: true });
        const backupFile = path.join(backups, `database-before-public-catalog-${stamp()}.sqlite`);
        await backup(db, backupFile);
        console.log(`Respaldo: ${backupFile}`);
        for (const asset of snapshot.assets) {
            const target = mediaPath(asset.path);
            const source = path.join(path.dirname(file), 'files', asset.path);
            await mkdir(path.dirname(target), { recursive: true });
            try {
                await access(target);
                if (await hashFile(target) === asset.sha256) continue;
                const previous = path.join(path.dirname(file), 'previous-media', asset.path);
                await mkdir(path.dirname(previous), { recursive: true });
                await copyFile(target, previous);
            } catch (error) { if (error.code !== 'ENOENT') throw error; }
            await copyFile(source, target);
        }
        replaceCatalog(db, snapshot);
        console.log(`Catálogo local actualizado: ${snapshot.products.length} productos, ${snapshot.combos.length} combos.`);
    } finally { db.close(); }
}

try {
    const [command, file] = process.argv.slice(2);
    if (command === 'snapshot') await downloadSnapshot();
    else if (command === 'stage') await stage(file);
    else if (command === 'apply') await apply(file);
    else throw new Error('Uso: node scripts/sync-public-catalog.mjs snapshot | stage <catalog.json> | apply <catalog.json>');
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
