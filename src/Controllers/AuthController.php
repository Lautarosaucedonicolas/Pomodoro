<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;
use App\Core\Auth;
use App\Services\UserService;

final class AuthController
{
    private UserService $users;

    public function __construct()
    {
        $this->users = new UserService();
    }

    /** POST /api/auth/register */
    public function register(): void
    {
        $b = $this->body();
        $name = trim((string) ($b['name'] ?? ''));
        $email = trim((string) ($b['email'] ?? ''));
        $password = (string) ($b['password'] ?? '');

        if ($name === '' || $email === '' || $password === '') {
            Response::json(['error' => 'Completá todos los campos'], 422);
            return;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'Email inválido'], 422);
            return;
        }
        if ($this->users->findByEmail($email) !== null) {
            Response::json(['error' => 'Ese email ya está registrado'], 409);
            return;
        }

        $user = $this->users->create($name, $email, $password);
        $token = $this->users->createSession($user['id']);
        Response::json(['token' => $token, 'user' => $this->publicUser($user)]);
    }

    /** POST /api/auth/login */
    public function login(): void
    {
        $b = $this->body();
        $email = trim((string) ($b['email'] ?? ''));
        $password = (string) ($b['password'] ?? '');

        $user = $this->users->findByEmail($email);
        if ($user === null || $user['password'] !== $password) {
            Response::json(['error' => 'Email o contraseña incorrectos'], 401);
            return;
        }
        $token = $this->users->createSession($user['id']);
        Response::json(['token' => $token, 'user' => $this->publicUser($user)]);
    }

    /** GET /api/auth/me */
    public function me(): void
    {
        $user = Auth::user();
        if ($user === null) {
            Response::json(['error' => 'No autenticado'], 401);
            return;
        }
        Response::json(['user' => $this->publicUser($user)]);
    }

    /** POST /api/auth/logout */
    public function logout(): void
    {
        $token = Auth::bearerToken();
        if ($token !== null) {
            $this->users->deleteSession($token);
        }
        Response::json(['ok' => true]);
    }

    private function body(): array
    {
        $raw = file_get_contents('php://input');
        $data = $raw !== false ? json_decode($raw, true) : null;
        return is_array($data) ? $data : [];
    }

    /** Nunca devolvemos la contraseña al frontend. */
    private function publicUser(array $u): array
    {
        return ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email']];
    }
}
