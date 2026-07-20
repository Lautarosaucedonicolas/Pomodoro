<?php

declare(strict_types=1);

/**
 * Punto de entrada (front controller).
 *
 * Toda petición que no sea un archivo estático (js, css, imágenes) entra por
 * acá. Registramos el autoloader, cargamos las rutas y despachamos.
 */

// --- Servir archivos estáticos tal cual cuando usamos el server embebido de PHP ---
if (PHP_SAPI === 'cli-server') {
    $requested = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($requested !== __DIR__ && is_file($requested)) {
        return false; // deja que el server embebido entregue el archivo
    }
}

// --- Autoloader simple PSR-4: App\ -> src/ ---
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = dirname(__DIR__) . '/src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

use App\Core\Router;

$router = new Router();

// Carga las definiciones de rutas.
(require dirname(__DIR__) . '/src/routes.php')($router);

$router->dispatch(
    $_SERVER['REQUEST_METHOD'],
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/'
);
