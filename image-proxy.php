<?php
// Proxy de imagens oficial do Portal NG Brasil
// Contorna bloqueios de CORS e hotlinking de portais de notícias externos (G1, UOL, CNN, etc.)
// Permitindo que o Canvas e o publicador do Instagram renderizem a imagem sem falhas.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: *");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$url = isset($_GET['url']) ? trim($_GET['url']) : '';

if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    header("Content-Type: text/plain; charset=UTF-8");
    exit("URL inválida ou ausente.");
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    header("Content-Type: text/plain; charset=UTF-8");
    exit("cURL não disponível no servidor.");
}

$parsed = parse_url($url);
$host = isset($parsed['host']) ? $parsed['host'] : '';
$scheme = isset($parsed['scheme']) ? $parsed['scheme'] : 'https';
$referer = $scheme . '://' . $host . '/';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 18);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_REFERER, $referer);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Fetch-Dest: image',
    'Sec-Fetch-Mode: no-cors',
    'Sec-Fetch-Site: cross-site'
]);

$imageData = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlError = curl_error($ch);
curl_close($ch);

if ($imageData !== false && $httpCode >= 200 && $httpCode < 400 && strlen($imageData) > 100) {
    if (!empty($contentType) && strpos($contentType, 'image/') !== false) {
        header("Content-Type: " . $contentType);
    } else {
        header("Content-Type: image/jpeg");
    }
    header("Content-Length: " . strlen($imageData));
    header("Cache-Control: public, max-age=86400"); // Cache de 24h
    echo $imageData;
    exit();
}

http_response_code(502);
header("Content-Type: text/plain; charset=UTF-8");
exit("Falha ao obter imagem da fonte. HTTP: $httpCode. Erro: $curlError");
