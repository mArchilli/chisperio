<?php

namespace App\Http\Controllers;

use App\Enums\TipoDocumento;
use App\Models\Documento;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DocumentoController extends Controller
{
    /**
     * El vendedor solo ve los documentos activos (mismo criterio que ofertas/add-ons
     * visibles en la tienda); el admin ve todo, para poder reactivar/editar lo que
     * esté oculto. Crear/editar/eliminar quedan reservados a role:admin (routes/web.php).
     */
    public function index(Request $request): Response
    {
        $documentos = Documento::query()
            ->when(! $request->user()->esAdmin(), fn ($query) => $query->activos())
            ->orderBy('orden')
            ->orderBy('titulo')
            ->get();

        return Inertia::render('Admin/Documentos/Index', [
            'documentos' => $documentos,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Documentos/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validarDatos($request);

        $atributos = [
            'titulo' => $validated['titulo'],
            'descripcion' => $validated['descripcion'] ?? null,
            'tipo' => $validated['tipo'],
            'orden' => $validated['orden'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ];

        if ($validated['tipo'] === TipoDocumento::Link->value) {
            $atributos['url'] = $validated['url'];
        } else {
            $atributos['ruta'] = $this->guardarArchivo($request);
        }

        Documento::create($atributos);

        return redirect()->route('documentos.index')
            ->with('success', 'Documento creado exitosamente.');
    }

    public function edit(Documento $documento): Response
    {
        return Inertia::render('Admin/Documentos/Edit', [
            'documento' => $documento,
        ]);
    }

    public function update(Request $request, Documento $documento): RedirectResponse
    {
        $validated = $this->validarDatos($request, $documento);

        $atributos = [
            'titulo' => $validated['titulo'],
            'descripcion' => $validated['descripcion'] ?? null,
            'tipo' => $validated['tipo'],
            'orden' => $validated['orden'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ];

        if ($validated['tipo'] === TipoDocumento::Link->value) {
            // Si venía de un PDF, se suelta el archivo viejo: ya no queda referenciado.
            if ($documento->tipo === TipoDocumento::Pdf) {
                $this->eliminarArchivoFisico($documento->ruta);
            }
            $atributos['url'] = $validated['url'];
            $atributos['ruta'] = null;
        } else {
            if ($request->hasFile('archivo')) {
                $this->eliminarArchivoFisico($documento->ruta);
                $atributos['ruta'] = $this->guardarArchivo($request);
            } else {
                $atributos['ruta'] = $documento->ruta;
            }
            $atributos['url'] = null;
        }

        $documento->update($atributos);

        return redirect()->route('documentos.index')
            ->with('success', 'Documento actualizado exitosamente.');
    }

    public function destroy(Documento $documento): RedirectResponse
    {
        if ($documento->tipo === TipoDocumento::Pdf) {
            $this->eliminarArchivoFisico($documento->ruta);
        }

        $documento->delete();

        return redirect()->route('documentos.index')
            ->with('success', 'Documento eliminado exitosamente.');
    }

    public function toggleActive(Documento $documento): RedirectResponse
    {
        $documento->update([
            'is_active' => ! $documento->is_active,
        ]);

        return back();
    }

    /**
     * `archivo` es obligatorio solo al crear un documento de tipo pdf, o al pasar un
     * link a pdf sin subir nada todavía; en cualquier otro update de un pdf existente
     * queda opcional (si no se manda uno nuevo, se conserva el archivo actual).
     */
    private function validarDatos(Request $request, ?Documento $documento = null): array
    {
        $tipo = $request->input('tipo');
        $archivoRequerido = $tipo === TipoDocumento::Pdf->value && empty($documento?->ruta);

        return $request->validate([
            'titulo' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'tipo' => ['required', Rule::in([TipoDocumento::Link->value, TipoDocumento::Pdf->value])],
            'url' => [$tipo === TipoDocumento::Link->value ? 'required' : 'nullable', 'string', 'url', 'max:2048'],
            'archivo' => [$archivoRequerido ? 'required' : 'nullable', 'file', 'mimes:pdf', 'max:20480'],
            'orden' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ], [
            'titulo.required' => 'El título es obligatorio.',
            'tipo.required' => 'Elegí si es un link o un archivo PDF.',
            'url.required' => 'El link es obligatorio para este tipo de documento.',
            'url.url' => 'El link no es una URL válida.',
            'archivo.required' => 'Subí un archivo PDF.',
            'archivo.mimes' => 'El archivo debe ser un PDF.',
            'archivo.max' => 'El PDF no puede superar los 20MB.',
        ]);
    }

    private function guardarArchivo(Request $request): string
    {
        $pdfPath = config('documentos.pdf_path');
        $publicPdfPath = public_path($pdfPath);

        if (! file_exists($publicPdfPath)) {
            mkdir($publicPdfPath, 0755, true);
        }

        $archivo = $request->file('archivo');
        $filename = time().'_'.$archivo->getClientOriginalName();
        $archivo->move($publicPdfPath, $filename);

        return $pdfPath.'/'.$filename;
    }

    private function eliminarArchivoFisico(?string $ruta): void
    {
        if (! $ruta) {
            return;
        }

        $filePath = public_path($ruta);
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
}
