<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Router mínimo. Mapea método + ruta exacta a un handler (callable).
 * Suficiente para un monolito chico; más adelante se puede sumar
 * parámetros dinámicos si hace falta.
 */
final class Router
{
    /** @var array<string, array<string, callable>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->routes['GET'][$path] = $handler;
    }

    public function post(string $path, callable $handler): void
    {
        $this->routes['POST'][$path] = $handler;
    }

    public function dispatch(string $method, string $path): void
    {
        $path = rtrim($path, '/') ?: '/';

        $handler = $this->routes[$method][$path] ?? null;

        if ($handler === null) {
            http_response_code(404);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Ruta no encontrada', 'path' => $path]);
            return;
        }

        $handler();
    }
}
