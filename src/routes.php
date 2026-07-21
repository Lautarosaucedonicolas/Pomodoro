<?php

declare(strict_types=1);

use App\Core\Router;
use App\Core\Response;
use App\Controllers\ProgressController;
use App\Controllers\ContentController;
use App\Controllers\AuthController;

/**
 * Definición central de rutas.
 * Devuelve una función que recibe el Router y registra todo.
 */
return static function (Router $router): void {

    // --- Vista SPA (una sola página, dos secciones) ---
    $router->get('/', static function (): void {
        Response::html(dirname(__DIR__) . '/public/app.html');
    });

    // --- API: progreso ---
    $router->get('/api/progress', [new ProgressController(), 'show']);
    $router->post('/api/pomodoro/complete', [new ProgressController(), 'completePomodoro']);
    $router->post('/api/progress/reset', [new ProgressController(), 'reset']);

    // --- API: contenido de neurociencia (niveles) ---
    $router->get('/api/content', [new ContentController(), 'index']);

    // --- API: autenticación ---
    $router->post('/api/auth/register', [new AuthController(), 'register']);
    $router->post('/api/auth/login', [new AuthController(), 'login']);
    $router->post('/api/auth/logout', [new AuthController(), 'logout']);
    $router->get('/api/auth/me', [new AuthController(), 'me']);
};
