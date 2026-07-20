<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Persistencia del progreso. Por ahora en un JSON (storage/progress.json).
 * Cuando sumemos base de datos, solo cambia esta clase; los controllers no.
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
    public function read(): array
    {
        if (!is_file($this->file)) {
            return $this->defaults();
        }
        $raw = file_get_contents($this->file);
        $data = $raw !== false ? json_decode($raw, true) : null;
        if (!is_array($data)) {
            return $this->defaults();
        }
        return [
            'points'             => (int) ($data['points'] ?? 0),
            'completedPomodoros' => (int) ($data['completedPomodoros'] ?? 0),
        ];
    }

    /** Suma un pomodoro completado y devuelve el progreso actualizado. */
    public function addCompletedPomodoro(): array
    {
        $data = $this->read();
        $data['completedPomodoros'] += 1;
        $data['points'] += self::POINTS_PER_POMODORO;
        $this->write($data);
        return $data;
    }

    public function reset(): array
    {
        $data = $this->defaults();
        $this->write($data);
        return $data;
    }

    public function pointsPerPomodoro(): int
    {
        return self::POINTS_PER_POMODORO;
    }

    private function write(array $data): void
    {
        $dir = dirname($this->file);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents(
            $this->file,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    /** @return array{points:int, completedPomodoros:int} */
    private function defaults(): array
    {
        return ['points' => 0, 'completedPomodoros' => 0];
    }
}
