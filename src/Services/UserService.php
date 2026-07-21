<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Usuarios y sesiones guardados en JSON (storage/users.json y sessions.json).
 * ⚠️ Las contraseñas se guardan en texto plano por ahora (sin encriptar),
 * como se pidió para esta etapa. Antes de producción: usar password_hash().
 */
final class UserService
{
    private string $usersFile;
    private string $sessionsFile;

    public function __construct(?string $dir = null)
    {
        $dir = $dir ?? dirname(__DIR__, 2) . '/storage';
        $this->usersFile = $dir . '/users.json';
        $this->sessionsFile = $dir . '/sessions.json';
    }

    // ---- Usuarios ----

    /** @return array<int,array<string,mixed>> */
    public function all(): array
    {
        return $this->readJson($this->usersFile);
    }

    public function findByEmail(string $email): ?array
    {
        foreach ($this->all() as $u) {
            if (strtolower((string) $u['email']) === strtolower($email)) {
                return $u;
            }
        }
        return null;
    }

    public function findById(string $id): ?array
    {
        foreach ($this->all() as $u) {
            if ($u['id'] === $id) {
                return $u;
            }
        }
        return null;
    }

    public function create(string $name, string $email, string $password): array
    {
        $users = $this->all();
        $user = [
            'id'        => bin2hex(random_bytes(8)),
            'name'      => $name,
            'email'     => $email,
            'password'  => $password, // texto plano por ahora
            'createdAt' => date('c'),
        ];
        $users[] = $user;
        $this->writeJson($this->usersFile, $users);
        return $user;
    }

    // ---- Sesiones (token -> userId) ----

    public function createSession(string $userId): string
    {
        $sessions = $this->readJson($this->sessionsFile);
        $token = bin2hex(random_bytes(24));
        $sessions[$token] = $userId;
        $this->writeJson($this->sessionsFile, $sessions);
        return $token;
    }

    public function userIdForToken(string $token): ?string
    {
        $sessions = $this->readJson($this->sessionsFile);
        return $sessions[$token] ?? null;
    }

    public function deleteSession(string $token): void
    {
        $sessions = $this->readJson($this->sessionsFile);
        unset($sessions[$token]);
        $this->writeJson($this->sessionsFile, $sessions);
    }

    // ---- IO ----

    private function readJson(string $file): array
    {
        if (!is_file($file)) {
            return [];
        }
        $raw = file_get_contents($file);
        $data = $raw !== false ? json_decode($raw, true) : null;
        return is_array($data) ? $data : [];
    }

    private function writeJson(string $file, array $data): void
    {
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
