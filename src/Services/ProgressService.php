<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Persistencia del progreso, ahora POR USUARIO.
 * storage/progress.json es un mapa { userId: {points, completedPomodoros} }.
 * Cuando sumemos base de datos, solo cambia esta clase.
 */
final class ProgressService
{
    private const POINTS_PER_POMODORO = 20;

    private string $file;

    public function __construct(?string $file = null)
    {
        $this->file = $file ?? dirname(__DIR__, 2) . '/storage/progress.json';
    }

    /** @return array{points:int, completedPomodoros:int} */
    public function read(string $userId): array
    {
        $all = $this->readAll();
        $d = $all[$userId] ?? null;
        return [
            'points'             => (int) ($d['points'] ?? 0),
            'completedPomodoros' => (int) ($d['completedPomodoros'] ?? 0),
        ];
    }

    public function addCompletedPomodoro(string $userId): array
    {
        $all = $this->readAll();
        $d = $this->read($userId);
        $d['completedPomodoros'] += 1;
        $d['points'] += self::POINTS_PER_POMODORO;
        $all[$userId] = $d;
        $this->writeAll($all);
        return $d;
    }

    public function reset(string $userId): array
    {
        $all = $this->readAll();
        $all[$userId] = ['points' => 0, 'completedPomodoros' => 0];
        $this->writeAll($all);
        return $all[$userId];
    }

    public function pointsPerPomodoro(): int
    {
        return self::POINTS_PER_POMODORO;
    }

    private function readAll(): array
    {
        if (!is_file($this->file)) {
            return [];
        }
        $raw = file_get_contents($this->file);
        $data = $raw !== false ? json_decode($raw, true) : null;
        return is_array($data) ? $data : [];
    }

    private function writeAll(array $all): void
    {
        $dir = dirname($this->file);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($this->file, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
