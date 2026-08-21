# Precios por cantidad — guía para cargar datos en el admin

Esta guía explica, en criollo, cómo funciona el sistema de "precios por escala de
cantidad" para quien carga productos y ofertas desde `/admin`. No es documentación
técnica de código — para eso ver `App\Services\PricingService` (backend) y
`resources/js/lib/pricing.js` (frontend, espeja la misma lógica).

## 1. Cómo se resuelve el precio según la cantidad

Cada producto tiene un **precio base** y, opcionalmente, una o más **escalas de
precio** cargadas en Admin → Productos → "Precios por Cantidad". Cada escala dice:
"a partir de tantas unidades, el precio unitario baja a tanto".

Ejemplo: un producto con precio base $1000 y estas escalas:

| Cantidad mínima | Precio unitario |
|---|---|
| 5+  | $900 |
| 20+ | $750 |

El precio que se le muestra al cliente para una cantidad `N` es un **escalón**, no
una interpolación: se usa la escala de mayor "cantidad mínima" que `N` cumpla.

- 1 a 4 unidades → precio base ($1000)
- 5 a 19 unidades → $900 (escala de 5+)
- 20 o más → $750 (escala de 20+)

Alguien que pide 19 unidades paga $900 cada una, no un precio intermedio entre
$900 y $750. Si pide 37 (sin escala propia en 37), se le aplica la escala de 20+
porque es la de mayor cantidad mínima que 37 todavía cumple.

## 2. Cómo interactúan las escalas y las ofertas

Una oferta (Admin → Ofertas) **no reemplaza** el precio por escala: se aplica
**después** de resolver el escalón que corresponde a la cantidad pedida, como un
descuento adicional sobre ese precio.

Orden de cálculo:

1. Se resuelve el escalón de precio según la cantidad (paso 1).
2. Si hay una oferta activa para el producto **y su alcance cubre ese escalón**,
   se le aplica el descuento de la oferta (porcentaje o valor fijo) sobre el
   precio de ese escalón.
3. Si no hay oferta, o la hay pero no cubre ese escalón puntual, el precio queda
   tal cual salió del paso 1.

Una oferta nunca "salta" de un escalón a otro ni cambia qué escalón aplica —
solo abarata (o no) el escalón que ya se resolvió.

## 3. Alcance de la oferta: "todos" vs. "específico"

Al crear/editar una oferta se elige el **alcance**:

- **Todos los precios de este producto**: el descuento se aplica sin importar
  la cantidad pedida — al precio base y a cualquier escala por igual. Es la
  opción para un "20% off en todo este producto".
- **Un precio específico**: el descuento aplica **solo** a un nivel puntual,
  elegido de un desplegable que lista el precio base y cada escala cargada
  (por ejemplo, "solo al precio de 20+ unidades"). Si el cliente pide una
  cantidad que resuelve a un escalón distinto del elegido, esa oferta no se
  aplica y el precio queda en el valor normal de ese escalón (sin descuento).

Ejemplo con el producto de arriba y una oferta de "20% off" con alcance
específico apuntando a la escala de 20+:

- Cliente pide 10 unidades → resuelve al escalón de 5+ ($900). La oferta no
  aplica a ese escalón → paga $900.
- Cliente pide 25 unidades → resuelve al escalón de 20+ ($750). La oferta sí
  aplica ahí → paga $600 (20% off de $750).

## 4. Restricción: no se puede borrar una escala con una oferta específica vigente

Si una oferta con alcance "específico" apunta a una escala puntual (por ejemplo
"20+ unidades"), esa escala **no se puede borrar** desde Admin → Productos
mientras la oferta siga activa (o todavía no haya empezado). El admin va a ver
un error indicando qué oferta bloquea el borrado.

Por qué existe esta restricción: si se dejara borrar la escala igual, la oferta
no desaparecería sola — pasaría a apuntar "a nada" y, en la práctica, empezaría
a aplicarse sobre el **precio base** del producto sin que nadie lo haya decidido
a propósito. Una oferta pensada para "20% off solo en el escalón de 20+" se
convertiría, en silencio, en "20% off en el precio base". Por eso el sistema
prefiere frenar el borrado con un aviso claro, en vez de resolverlo solo.

**Cómo destrabarlo:** desde Admin → Ofertas, eliminar la oferta que bloquea el
borrado (o editarla para que apunte a otro precio, o para que su alcance pase a
"todos"). Una vez que ya no hay ninguna oferta específica activa apuntando a esa
escala, se puede borrar sin problema. Una oferta específica ya **vencida**
(con fecha de fin pasada) nunca bloquea nada, porque ya no se va a volver a
aplicar de todos modos.

Esta misma protección no hace falta al borrar un producto entero: al borrar el
producto se borran junto con él tanto sus escalas como sus ofertas, así que
nunca queda una oferta suelta apuntando al precio base de otro producto.
