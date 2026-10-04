<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Chisperío') }}</title>

        <!-- Favicons -->
        <link rel="icon" type="image/png" href="/images/favicons/favicon-96x96.png" sizes="96x96">
        <link rel="icon" type="image/svg+xml" href="/images/favicons/favicon.svg">
        <link rel="shortcut icon" href="/images/favicons/favicon.ico">
        <link rel="apple-touch-icon" sizes="180x180" href="/images/favicons/apple-touch-icon.png">
        <link rel="manifest" href="/images/favicons/site.webmanifest">
        <meta name="apple-mobile-web-app-title" content="Chisperío">
        <meta name="theme-color" content="#6000ca">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead

        @include('partials.meta-pixel')
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
