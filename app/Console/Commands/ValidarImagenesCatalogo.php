<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class ValidarImagenesCatalogo extends Command
{
    protected $signature = 'catalogo:validar-imagenes';

    protected $description = 'Valida que las imagen_url del catalogo CSV respondan correctamente (HEAD request)';

    public function handle(): int
    {
        $csvPath = database_path('seeders/data/chisperio_catalogo.csv');

        if (! file_exists($csvPath)) {
            $this->error("No se encontro el archivo: {$csvPath}");

            return self::FAILURE;
        }

        $filas = $this->leerCsv($csvPath);

        if (empty($filas)) {
            $this->warn('El CSV no tiene filas para procesar.');

            return self::SUCCESS;
        }

        $this->info('Verificando '.count($filas).' URLs de imagenes...');

        $responses = Http::pool(fn (Pool $pool) => collect($filas)
            ->map(fn (array $fila, int $i) => $pool->as($i)->timeout(10)->head($fila['imagen_url']))
            ->all());

        $ok = 0;
        $fallidas = [];

        foreach ($filas as $i => $fila) {
            $respuesta = $responses[$i] ?? null;
            $motivo = $this->evaluarRespuesta($respuesta);

            if ($motivo === null) {
                $ok++;
            } else {
                $fallidas[] = [
                    'titulo' => $fila['titulo'],
                    'imagen_url' => $fila['imagen_url'],
                    'motivo' => $motivo,
                ];
            }
        }

        $this->mostrarResumen(count($filas), $ok, $fallidas);
        $this->guardarFallidas($fallidas);

        return self::SUCCESS;
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

    private function evaluarRespuesta(mixed $respuesta): ?string
    {
        if ($respuesta instanceof ConnectionException) {
            return 'timeout/error de conexion: '.$respuesta->getMessage();
        }

        if ($respuesta instanceof \Throwable) {
            return 'error: '.$respuesta->getMessage();
        }

        if ($respuesta instanceof Response) {
            if ($respuesta->successful()) {
                return null;
            }

            return 'HTTP '.$respuesta->status();
        }

        return 'respuesta desconocida';
    }

    private function mostrarResumen(int $total, int $ok, array $fallidas): void
    {
        $this->newLine();
        $this->info("Total de URLs verificadas: {$total}");
        $this->info("OK: {$ok}");
        $this->warn('Fallidas: '.count($fallidas));

        if (empty($fallidas)) {
            return;
        }

        $this->newLine();
        $this->table(
            ['Titulo', 'Imagen URL', 'Motivo'],
            collect($fallidas)->map(fn (array $f) => [$f['titulo'], $f['imagen_url'], $f['motivo']])->all()
        );
    }

    private function guardarFallidas(array $fallidas): void
    {
        $destino = database_path('seeders/data/imagenes_rotas.csv');
        $handle = fopen($destino, 'w');

        fputcsv($handle, ['titulo', 'imagen_url', 'motivo']);

        foreach ($fallidas as $f) {
            fputcsv($handle, [$f['titulo'], $f['imagen_url'], $f['motivo']]);
        }

        fclose($handle);

        $this->newLine();
        $this->info("Listado de fallidas guardado en: {$destino}");
    }
}
