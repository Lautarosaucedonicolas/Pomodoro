<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Lógica de niveles: cuántos puntos hacen falta, qué nivel corresponde
 * a X puntos y qué contenido de neurociencia está desbloqueado.
 *
 * El contenido vive en data/levels.json para poder editarlo sin tocar código.
 */
final class LevelService
{
    /** @var array<int, array<string, mixed>> */
    private array $levels;

    public function __construct(?string $levelsFile = null)
    {
        $levelsFile ??= dirname(__DIR__, 2) . '/data/levels.json';
        $raw = file_get_contents($levelsFile);
        $this->levels = $raw !== false ? (json_decode($raw, true) ?? []) : [];
    }

    /** Nivel actual según los puntos acumulados. */
    public function levelForPoints(int $points): int
    {
        $current = 1;
        foreach ($this->levels as $level) {
            if ($points >= (int) $level['pointsRequired']) {
                $current = (int) $level['level'];
            }
        }
        return $current;
    }

    /** Puntos necesarios para el próximo nivel (null si ya es el máximo). */
    public function pointsForNextLevel(int $points): ?int
    {
        foreach ($this->levels as $level) {
            if ($points < (int) $level['pointsRequired']) {
                return (int) $level['pointsRequired'];
            }
        }
        return null;
    }

    /** Todos los niveles, marcando cuáles están desbloqueados. */
    public function unlockedContent(int $points): array
    {
        $out = [];
        foreach ($this->levels as $level) {
            $unlocked = $points >= (int) $level['pointsRequired'];
            $out[] = [
                'level'         => (int) $level['level'],
                'name'          => $level['name'],
                'pointsRequired' => (int) $level['pointsRequired'],
                'brainRegion'   => $level['brainRegion'],
                'unlocked'      => $unlocked,
                // El contenido solo se envía si está desbloqueado.
                'neuroLearning' => $unlocked ? $level['neuroLearning'] : null,
                'neuroThinking' => $unlocked ? $level['neuroThinking'] : null,
                'exercise'      => $unlocked ? $level['exercise'] : null,
            ];
        }
        return $out;
    }

    public function maxLevel(): int
    {
        return count($this->levels);
    }
}
