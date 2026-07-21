<?php

declare(strict_types=1);

namespace App\Core;

use App\Services\UserService;

/**
 * Helper de autenticación: resuelve el usuario actual a partir del token
 * "Bearer" que manda el frontend en el header Authorization.
 */
final class Auth
{
    public static function bearerToken(): ?string
    {
        $auth = '';
        if (function_exists('getallheaders')) {
            $headers = getallheaders() ?: [];
            $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if ($auth === '') {
            $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        }
        if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    /** @return array<string,mixed>|null usuario actual o null si no está logueado */
    public static function user(): ?array
    {
        $token = self::bearerToken();
        if ($token === null) {
            return null;
        }
        $users = new UserService();
        $userId = $users->userIdForToken($token);
        return $userId !== null ? $users->findById($userId) : null;
    }

    /** Corta la ejecución con 401 si no hay usuario; si hay, lo devuelve. */
    public static function requireUser(): array
    {
        $user = self::user();
        if ($user === null) {
            Response::json(['error' => 'No autenticado'], 401);
            exit;
        }
        return $user;
    }
}
