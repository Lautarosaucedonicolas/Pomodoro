<?php

declare(strict_types=1);

use App\Core\Router;
use App\Core\Response;
use App\Controllers\ProgressController;
use App\Controllers\ContentController;

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
};
