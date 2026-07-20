<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;
use App\Services\ProgressService;
use App\Services\LevelService;

final class ContentController
{
    /** GET /api/content -> niveles con su contenido (bloqueado/desbloqueado) */
    public function index(): void
    {
        $points = (new ProgressService())->read()['points'];
        Response::json([
            'levels' => (new LevelService())->unlockedContent($points),
        ]);
    }
}
