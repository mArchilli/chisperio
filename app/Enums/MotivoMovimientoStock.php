<?php

namespace App\Enums;

enum MotivoMovimientoStock: string
{
    case PedidoCreado = 'pedido_creado';
    case PedidoCancelado = 'pedido_cancelado';
    case AjusteManual = 'ajuste_manual';
}
