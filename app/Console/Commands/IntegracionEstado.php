<?php

namespace App\Console\Commands;

use App\Enums\EstadoPedido;
use App\Enums\Sucursal;
use App\Models\Pedido;
use App\Models\User;
use App\Rukoz\CheckoutCentral;
use App\Rukoz\ConfirmacionDeVenta;
use App\Rukoz\EspejoStock;
use App\Rukoz\PuntoDeAtencion;
use App\Rukoz\ReferenciasDelCentral;
use App\Rukoz\VendedorParaCentral;
use Illuminate\Console\Command;
use Rukoz\CoreClient\Compensaciones\Compensacion;
use Rukoz\CoreClient\Errores\RukozException;
use Rukoz\CoreClient\Eventos\PedidoActualizado;
use Rukoz\CoreClient\Facades\Rukoz;
use Throwable;

class IntegracionEstado extends Command
{
    protected $signature = 'chisperio:integracion-estado';

    protected $description = 'Estado de la integración con el Central: interruptores, ping, ítems sin espejo y reservas pendientes de compensar (código 1 si algo está mal)';

    public function handle(): int
    {
        $mal = false;
        $integracion = (bool) config('rukoz.habilitada');

        $this->components->twoColumnDetail('<fg=white;options=bold>Interruptores</>');
        $this->components->twoColumnDetail('RUKOZ_INTEGRACION (paquete)', $this->onOff($integracion));
        $this->components->twoColumnDetail('INTEGRACION_CATALOGO (11.1)', $this->onOff((bool) config('integracion.catalogo')));
        $this->components->twoColumnDetail('INTEGRACION_STOCK (11.2)', $this->onOff((bool) config('integracion.stock')));
        $this->components->twoColumnDetail(
            'INTEGRACION_CHECKOUT (11.3)',
            $this->onOff(CheckoutCentral::solicitado()).(CheckoutCentral::solicitado() ? (CheckoutCentral::activo() ? ' → <fg=green>el checkout USA el Central</>' : ' → <fg=red>el checkout NO usa el Central</>') : '')
        );
        $this->components->twoColumnDetail(
            'INTEGRACION_CONFIRMACION (11.4)',
            $this->onOff((bool) config('integracion.confirmacion')).((bool) config('integracion.confirmacion') ? (ConfirmacionDeVenta::activa() ? ' → <fg=green>se confirma y se reflejan los estados</>' : ' → <fg=red>falta RUKOZ_INTEGRACION: no hace nada</>') : '')
        );
        $this->components->twoColumnDetail('Vender sin reserva si el Central no responde', CheckoutCentral::permiteVenderSinReserva() ? '<fg=yellow>SÍ</>' : 'no (el pedido no se crea)');
        $this->components->twoColumnDetail('Cancelación automática de reservas', CheckoutCentral::diasParaCancelar().' días sin confirmar');

        if (($advertencia = CheckoutCentral::advertencia()) !== null) {
            $this->components->warn($advertencia);
            $mal = true;
        }

        $this->newLine();
        $this->components->twoColumnDetail('<fg=white;options=bold>Central</>');
        $mal = $this->ping($integracion) || $mal;

        $this->newLine();
        $this->components->twoColumnDetail('<fg=white;options=bold>Stock</>');
        $auditoria = EspejoStock::auditar();
        $sinEspejo = count($auditoria['problemas']);
        $this->components->twoColumnDetail('Ítems activos sin espejo', $sinEspejo === 0 ? '<fg=green>0</>' : "<fg=red>{$sinEspejo}</> (corré chisperio:stock-sin-espejo y chisperio:stock-cargar)");
        $this->components->twoColumnDetail('Revisados / sin vincular en el Central', $auditoria['revisados'].' / '.$auditoria['sin_vincular']);
        $mal = $mal || ($sinEspejo > 0 && CheckoutCentral::solicitado());

        $this->newLine();
        $this->components->twoColumnDetail('<fg=white;options=bold>Reservas</>');
        $mal = $this->reservas() || $mal;

        $this->newLine();
        $this->components->twoColumnDetail('<fg=white;options=bold>Ventas (11.4)</>');
        $mal = $this->ventas() || $mal;

        $this->newLine();
        $this->components->twoColumnDetail('<fg=white;options=bold>Puntos de atención (11.4b)</>');
        $mal = $this->puntos($integracion) || $mal;

        return $mal ? self::FAILURE : self::SUCCESS;
    }

    /** @return bool true si hay un problema */
    private function ping(bool $integracion): bool
    {
        if (! $integracion) {
            $this->components->twoColumnDetail('Ping al Central', 'omitido (RUKOZ_INTEGRACION apagado)');

            return false;
        }

        $inicio = microtime(true);

        try {
            $respuesta = Rukoz::ping();
            $ms = (int) round((microtime(true) - $inicio) * 1000);
            $this->components->twoColumnDetail('Ping al Central', "<fg=green>OK</> ({$ms} ms) — ".($respuesta['integracion']['nombre'] ?? 'integración'));
        } catch (RukozException $e) {
            $this->components->twoColumnDetail('Ping al Central', "<fg=red>FALLA</> — {$e->codigo()}");

            return true;
        } catch (Throwable $e) {
            $this->components->twoColumnDetail('Ping al Central', '<fg=red>FALLA</> — '.$e::class);

            return true;
        }

        $this->components->twoColumnDetail('Circuito', Rukoz::circuitoAbierto() ? '<fg=red>ABIERTO</>' : 'cerrado');

        return Rukoz::circuitoAbierto();
    }

    /** @return bool true si hay un problema */
    private function reservas(): bool
    {
        $abiertas = Pedido::query()->whereNotNull('rukoz_ref')->where('estado', EstadoPedido::Pendiente)->where('rukoz_estado', Pedido::RESERVA_RESERVADA);
        $viejas = (clone $abiertas)->where('created_at', '<', now()->subDays(CheckoutCentral::diasParaCancelar()))->count();

        $this->components->twoColumnDetail('Pedidos con reserva abierta', (string) (clone $abiertas)->count());
        $this->components->twoColumnDetail('…con más de '.CheckoutCentral::diasParaCancelar().' días (los cancela el cron)', (string) $viejas);

        $pendientes = Compensacion::query()->pendientes()->get(['id', 'ref', 'tipo']);
        $fallidas = Compensacion::query()->where('estado', Compensacion::FALLIDA)->count();
        $conPedido = Pedido::query()->whereIn('rukoz_ref', $pendientes->pluck('ref'))->count();
        $canceladosPendientes = Pedido::query()->where('rukoz_estado', Pedido::RESERVA_CANCELACION_PENDIENTE)->count();

        $porTipo = $pendientes->countBy('tipo')->map(fn (int $n, string $tipo) => "{$tipo}: {$n}")->implode(', ');

        $this->components->twoColumnDetail(
            'Reservas pendientes de compensar',
            $pendientes->isEmpty() ? '<fg=green>0</>' : '<fg=yellow>'.$pendientes->count().'</> ('.$porTipo.')'
        );
        $this->components->twoColumnDetail('…de pedidos que existen en la web', (string) $conPedido);
        $this->components->twoColumnDetail('Pedidos cancelados esperando que el Central confirme', (string) $canceladosPendientes);
        $this->components->twoColumnDetail('Compensaciones fallidas (vencieron: requieren una persona)', $fallidas === 0 ? '<fg=green>0</>' : "<fg=red>{$fallidas}</>");

        return $fallidas > 0;
    }

    /** @return bool true si hay un problema */
    private function ventas(): bool
    {
        $porEstado = Pedido::query()->whereNotNull('rukoz_ref')->whereNotNull('confirmado_at')->get(['estado'])->countBy(fn (Pedido $p) => $p->estado->value);
        $detalle = $porEstado->isEmpty() ? 'ninguna' : $porEstado->map(fn (int $n, string $estado) => "{$estado}: {$n}")->implode(', ');
        $this->components->twoColumnDetail('Ventas confirmadas en el Central', $detalle);

        $conSaldo = Pedido::query()->whereNotNull('rukoz_ref')->whereIn('estado', [EstadoPedido::Confirmado->value, EstadoPedido::Empaquetado->value, EstadoPedido::Despachado->value, EstadoPedido::Entregado->value])->where('rukoz_saldo', '>', 0)->count();
        $this->components->twoColumnDetail('…con saldo pendiente de cobro', (string) $conSaldo);

        $usuarios = User::query()->get(['id', 'rukoz_vendedor_id']);
        $sinMapeo = $usuarios->filter(fn (User $u) => ! VendedorParaCentral::mapeado($u))->count();
        $this->components->twoColumnDetail('Usuarios con vendedor del Central asignado', ($usuarios->count() - $sinMapeo).' de '.$usuarios->count().($sinMapeo > 0 ? " (los {$sinMapeo} restantes no pueden confirmar: chisperio:vendedor-mapear)" : ''));

        $mal = false;

        if (config('integracion.confirmacion') && ! CheckoutCentral::activo()) {
            $this->components->warn('INTEGRACION_CONFIRMACION está encendido pero el checkout no usa el Central: no habrá pedidos con reserva para confirmar.');
            $mal = true;
        }

        if (config('integracion.confirmacion') && ConfirmacionDeVenta::activa()) {
            $this->components->twoColumnDetail('Listener de estados del Central', $this->listenerActivo() ? '<fg=green>registrado</>' : '<fg=red>NO registrado</> (reiniciá/limpiá la config)');
            $mal = $mal || ! $this->listenerActivo();
        }

        return $mal;
    }

    /**
     * Cada sucursal de la web contra los puntos que devuelve `GET /referencias`. Un código que el Central no tiene lo rechazaría
     * (PUNTO_DESCONOCIDO) en el checkout, la edición y la confirmación: es un error de configuración.
     *
     * @return bool true si hay un problema
     */
    private function puntos(bool $integracion): bool
    {
        $mapeo = collect(Sucursal::cases())->map(fn (Sucursal $s) => $s->label().' → '.(PuntoDeAtencion::codigoDe($s) ?? 'sin código'))->implode(', ');
        $this->components->twoColumnDetail('Sucursal de la web → punto del Central', $mapeo);

        if (! $integracion) {
            $this->components->twoColumnDetail('Puntos del Central', 'omitido (RUKOZ_INTEGRACION apagado)');

            return false;
        }

        $referencias = ReferenciasDelCentral::obtener(forzar: true);

        if ($referencias['origen'] !== 'central') {
            $this->components->twoColumnDetail('Puntos del Central', '<fg=yellow>no se pudieron leer</> ('.($referencias['error'] ?? 'sin respuesta').')');

            return false;
        }

        $mal = false;
        $this->components->twoColumnDetail('Puntos del Central', collect($referencias['puntos'])->map(fn ($p) => ($p['codigo'] ?? '?').($p['predeterminado'] ?? false ? ' (predeterminado)' : ''))->implode(', ') ?: 'ninguno');

        foreach (PuntoDeAtencion::validar($referencias['puntos']) as $fila) {
            if (! $fila['existe']) {
                $this->components->twoColumnDetail($fila['sucursal']->label(), "<fg=red>ERROR</> el código «{$fila['codigo']}» no existe en el Central (INTEGRACION_PUNTO_*)");
                $mal = true;
            }
        }

        if (! $mal) {
            $this->components->twoColumnDetail('Códigos configurados', '<fg=green>todos existen en el Central</>');
        }

        return $mal;
    }

    private function listenerActivo(): bool
    {
        return app('events')->hasListeners(PedidoActualizado::class);
    }

    private function onOff(bool $valor): string
    {
        return $valor ? '<fg=green>encendido</>' : 'apagado';
    }
}
