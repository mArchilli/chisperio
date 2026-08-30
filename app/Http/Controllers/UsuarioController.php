<?php

namespace App\Http\Controllers;

use App\Enums\RolUsuario;
use App\Enums\Sucursal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UsuarioController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Usuarios/Index', [
            'usuarios' => User::orderBy('name')->get(['id', 'name', 'email', 'role', 'sucursal', 'debe_cambiar_password']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Usuarios/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users,email',
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::enum(RolUsuario::class)],
            'sucursal' => $this->reglaSucursal($request),
        ], $this->mensajes());

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'sucursal' => $this->sucursalSegunRol($validated),
            'email_verified_at' => now(), // alta manual por admin: se considera verificado
            // La clave que puso el admin es temporal: el vendedor define la suya
            // propia en el primer ingreso (RequerirCambioDePassword). El admin no.
            'debe_cambiar_password' => RolUsuario::from($validated['role']) === RolUsuario::Vendedor,
        ]);

        return redirect()->route('usuarios.index')->with('success', 'Usuario creado exitosamente.');
    }

    public function edit(User $usuario): Response
    {
        return Inertia::render('Admin/Usuarios/Edit', [
            'usuario' => $usuario->only('id', 'name', 'email', 'role', 'sucursal'),
        ]);
    }

    public function update(Request $request, User $usuario): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($usuario->id)],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::enum(RolUsuario::class)],
            'sucursal' => $this->reglaSucursal($request),
        ], $this->mensajes());

        $nuevoRol = RolUsuario::from($validated['role']);

        if ($usuario->esAdmin() && $nuevoRol !== RolUsuario::Admin && $this->esUnicoAdmin($usuario)) {
            throw ValidationException::withMessages([
                'role' => 'No podés quitarle el rol de admin al único administrador del sistema.',
            ]);
        }

        $usuario->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $nuevoRol,
            'sucursal' => $this->sucursalSegunRol($validated),
        ]);

        if (! empty($validated['password'])) {
            $usuario->password = Hash::make($validated['password']);
        }

        $usuario->save();

        return redirect()->route('usuarios.index')->with('success', 'Usuario actualizado exitosamente.');
    }

    public function destroy(Request $request, User $usuario): RedirectResponse
    {
        if ($usuario->is($request->user())) {
            return back()->with('error', 'No podés eliminar tu propia cuenta.');
        }

        if ($this->esUnicoAdmin($usuario)) {
            return back()->with('error', 'No se puede eliminar al único administrador del sistema.');
        }

        $usuario->delete();

        return redirect()->route('usuarios.index')->with('success', 'Usuario eliminado exitosamente.');
    }

    private function esUnicoAdmin(User $usuario): bool
    {
        return $usuario->esAdmin() && User::where('role', RolUsuario::Admin)->count() === 1;
    }

    /**
     * La sucursal es obligatoria y validada como enum solo cuando el rol es
     * `vendedor` (define qué pedidos ve). Para admin queda libre — el form manda
     * `sucursal: ''` para el campo oculto y `sucursalSegunRol()` la fuerza a null
     * igual.
     */
    private function reglaSucursal(Request $request): array
    {
        return $request->input('role') === RolUsuario::Vendedor->value
            ? ['required', Rule::enum(Sucursal::class)]
            : ['nullable'];
    }

    private function sucursalSegunRol(array $validated): ?string
    {
        return RolUsuario::from($validated['role']) === RolUsuario::Vendedor
            ? ($validated['sucursal'] ?? null)
            : null;
    }

    private function mensajes(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'email.required' => 'El email es obligatorio.',
            'email.email' => 'Ingresá un email válido.',
            'email.unique' => 'Ya existe un usuario con ese email.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.confirmed' => 'La confirmación de contraseña no coincide.',
            'role.required' => 'Elegí un rol para el usuario.',
            'sucursal.required' => 'Elegí una sucursal para el vendedor.',
        ];
    }
}
