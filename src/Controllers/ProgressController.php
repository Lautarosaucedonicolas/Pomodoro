<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;
use App\Services\ProgressService;
use App\Services\LevelService;

final class ProgressController
{
    private ProgressService $progress;
    private LevelService $levels;

    public function __construct()
    {
        $this->progress = new ProgressService();
        $this->levels = new LevelService();
    }

    /** GET /api/progress */
    public function show(): void
    {
        Response::json($this->buildState($this->progress->read()));
    }

    /** POST /api/pomodoro/complete */
    public function completePomodoro(): void
    {
        $before = $this->levels->levelForPoints($this->progress->read()['points']);
        $data = $this->progress->addCompletedPomodoro();
        $after = $this->levels->levelForPoints($data['points']);

        $state = $this->buildState($data);
        $state['leveledUp'] = $after > $before;
        Response::json($state);
    }

    /** POST /api/progress/reset */
    public function reset(): void
    {
        Response::json($this->buildState($this->progress->reset()));
    }

    /** Arma el estado completo que consume el frontend. */
    private function buildState(array $data): array
    {
        $points = $data['points'];
        return [
            'points'             => $points,
            'completedPomodoros' => $data['completedPomodoros'],
            'pointsPerPomodoro'  => $this->progress->pointsPerPomodoro(),
            'level'              => $this->levels->levelForPoints($points),
            'maxLevel'           => $this->levels->maxLevel(),
            'nextLevelPoints'    => $this->levels->pointsForNextLevel($points),
        ];
    }
}
