{{--
    Meta Pixel — única fuente del base code (ver resources/views/app.blade.php).
    Solo en producción y con META_PIXEL_ID configurado. Las rutas privadas (panel,
    login, etc.) no cargan el pixel.

    OJO: esta lista de prefijos debe mantenerse sincronizada con PRIVATE_PATHS en
    resources/js/lib/pixel.js (que cubre las navegaciones de Inertia, donde este
    partial ya no se vuelve a renderizar).

    Limitación conocida (no se resuelve): quien entra por una ruta excluida (p. ej.
    /login) y navega a una pública sin recargar no tiene fbq cargado, así que ese
    recorrido no envía eventos. Solo afecta al staff.
--}}
@php
    $pixelRutasPrivadas = ['admin', 'dashboard', 'profile', 'login', 'forgot-password', 'reset-password', 'verify-email', 'confirm-password', 'password'];
    $pixelPatrones = collect($pixelRutasPrivadas)->flatMap(fn ($ruta) => [$ruta, "{$ruta}/*"])->all();
@endphp
@if (app()->environment('production') && config('services.meta.pixel_id') && ! request()->is(...$pixelPatrones))
    <!-- Meta Pixel Code -->
    <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '{{ config('services.meta.pixel_id') }}');
        fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id={{ config('services.meta.pixel_id') }}&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel Code -->
@endif
