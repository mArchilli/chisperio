<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Red de seguridad: ningún test puede correr contra una base que no sea SQLite en
     * memoria. phpunit.xml ya fuerza DB_CONNECTION=sqlite / DB_DATABASE=:memory:, pero si
     * alguien lo toca (o corre con otra config) los RefreshDatabase terminarían borrando
     * la base local de trabajo. Mejor frenar en seco que migrar sobre MySQL.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $conexion = config('database.default');
        $driver = config("database.connections.{$conexion}.driver");
        $base = config("database.connections.{$conexion}.database");

        if ($driver !== 'sqlite' || $base !== ':memory:') {
            throw new RuntimeException(
                "Los tests solo pueden correr contra SQLite en memoria (conexión '{$conexion}', driver '{$driver}', base '{$base}'). ".
                'Revisá phpunit.xml: DB_CONNECTION=sqlite y DB_DATABASE=:memory:.'
            );
        }
    }
}
