<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Subcategoria;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;

class ProductoCatalogoSeeder extends Seeder
{
    use WithoutModelEvents;

    private array $categoriasCache = [];

    private array $subcategoriasCache = [];

    private int $productosCreados = 0;

    private int $productosActualizados = 0;

    private int $categoriasNuevas = 0;

    private int $subcategoriasNuevas = 0;

    private array $sinImagen = [];

    public function run(): void
    {
        $csvPath = database_path('seeders/data/chisperio_catalogo.csv');

        if (! file_exists($csvPath)) {
            $this->command?->error("No se encontro el archivo: {$csvPath}");

            return;
        }

        foreach ($this->leerCsv($csvPath) as $index => $fila) {
            $categoria = $this->resolverCategoria(trim($fila['categoria']));
            $subcategoria = $this->resolverSubcategoria(trim($fila['subcategoria'] ?? ''), $categoria);

            $producto = $this->resolverProducto($fila);

            $producto->categorias()->sync([$categoria->id]);
            $producto->subcategorias()->sync($subcategoria ? [$subcategoria->id] : []);

            $this->resolverImagen($producto, trim($fila['imagen_url'] ?? ''), $index);
        }

        $this->imprimirResumen();
    }

    private function leerCsv(string $path): array
    {
        $filas = [];
        $handle = fopen($path, 'r');
        $encabezados = fgetcsv($handle);

        while (($fila = fgetcsv($handle)) !== false) {
            $filas[] = array_combine($encabezados, $fila);
        }

        fclose($handle);

        return $filas;
    }

    private function resolverCategoria(string $nombre): Categoria
    {
        if (isset($this->categoriasCache[$nombre])) {
            return $this->categoriasCache[$nombre];
        }

        $categoria = Categoria::firstOrCreate(['nombre' => $nombre]);

        if ($categoria->wasRecentlyCreated) {
            $this->categoriasNuevas++;
        }

        return $this->categoriasCache[$nombre] = $categoria;
    }

    private function resolverSubcategoria(string $nombre, Categoria $categoria): ?Subcategoria
    {
        if ($nombre === '') {
            return null;
        }

        $clave = $categoria->id.'|'.$nombre;

        if (isset($this->subcategoriasCache[$clave])) {
            return $this->subcategoriasCache[$clave];
        }

        $subcategoria = Subcategoria::firstOrCreate([
            'nombre' => $nombre,
            'categoria_id' => $categoria->id,
        ]);

        if ($subcategoria->wasRecentlyCreated) {
            $this->subcategoriasNuevas++;
        }

        return $this->subcategoriasCache[$clave] = $subcategoria;
    }

    private function resolverProducto(array $fila): Producto
    {
        $producto = Producto::updateOrCreate(
            ['titulo' => trim($fila['titulo'])],
            [
                'descripcion' => trim($fila['descripcion'] ?? ''),
                'precio' => (float) $fila['precio'],
                'is_active' => true,
            ]
        );

        if ($producto->wasRecentlyCreated) {
            $this->productosCreados++;
        } else {
            $this->productosActualizados++;
        }

        return $producto;
    }

    private function resolverImagen(Producto $producto, string $imagenUrl, int $index): void
    {
        if ($imagenUrl === '') {
            $this->sinImagen[] = $producto->titulo;

            return;
        }

        if ($producto->imagenPrincipal()->exists()) {
            return;
        }

        try {
            $respuesta = Http::timeout(15)->get($imagenUrl);
        } catch (\Throwable $e) {
            $this->sinImagen[] = $producto->titulo;

            return;
        }

        if (! $respuesta->successful()) {
            $this->sinImagen[] = $producto->titulo;

            return;
        }

        $imgPath = config('productos.img_path');
        $publicImgPath = public_path($imgPath);

        if (! file_exists($publicImgPath)) {
            mkdir($publicImgPath, 0755, true);
        }

        $nombreOriginal = basename(parse_url($imagenUrl, PHP_URL_PATH) ?: '') ?: 'imagen.jpg';
        $filename = time().'_'.$index.'_'.$nombreOriginal;

        file_put_contents($publicImgPath.'/'.$filename, $respuesta->body());

        $producto->media()->create([
            'tipo' => 'imagen',
            'ruta' => $imgPath.'/'.$filename,
            'orden' => 1,
            'is_principal' => true,
        ]);
    }

    private function imprimirResumen(): void
    {
        $io = $this->command;

        if (! $io) {
            return;
        }

        $io->newLine();
        $io->info("Productos creados: {$this->productosCreados}");
        $io->info("Productos actualizados: {$this->productosActualizados}");
        $io->info("Categorias nuevas: {$this->categoriasNuevas}");
        $io->info("Subcategorias nuevas: {$this->subcategoriasNuevas}");

        $io->newLine();
        $io->warn('Productos sin imagen: '.count($this->sinImagen));

        foreach ($this->sinImagen as $titulo) {
            $io->line("  - {$titulo}");
        }
    }
}
