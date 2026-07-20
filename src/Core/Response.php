<?php

declare(strict_types=1);

namespace App\Core;

/** Helpers para responder desde los controllers. */
final class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    public static function html(string $file): void
    {
        http_response_code(200);
        header('Content-Type: text/html; charset=utf-8');
        readfile($file);
    }
}
