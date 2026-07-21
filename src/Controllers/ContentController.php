<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;
use App\Core\Auth;
use App\Services\ProgressService;
use App\Services\LevelService;

final class ContentController
{
    /** GET /api/content -> niveles con su contenido (bloqueado/desbloqueado) */
    public function index(): void
    {
        $user = Auth::requireUser();
        $points = (new ProgressService())->read($user['id'])['points'];
        Response::json([
            'levels' => (new LevelService())->unlockedContent($points),
        ]);
    }
}
