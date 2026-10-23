<?php
// Script oficial de entrega de imagem para Open Graph / WhatsApp / Redes Sociais
// Suporta matérias pendentes de aprovação ('drafts') e publicadas ('news')

error_reporting(0);
ini_set('display_errors', 0);

$id = isset($_GET['id']) ? trim($_GET['id']) : '';

if (!$id) {
    serveFallbackImage();
}

// 1. Tenta buscar em 'drafts', depois em 'news'
$endpoints = [
    "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/drafts/" . urlencode($id),
    "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/news/" . urlencode($id)
];

$image_data = "";

foreach ($endpoints as $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if (isset($data['fields']['image']['stringValue']) && !empty($data['fields']['image']['stringValue'])) {
            $image_data = $data['fields']['image']['stringValue'];
            break;
        } elseif (isset($data['fields']['metadata']['mapValue']['fields']['imagem']['stringValue'])) {
            $image_data = $data['fields']['metadata']['mapValue']['fields']['imagem']['stringValue'];
            break;
        }
    }
}

if (!$image_data) {
    serveFallbackImage();
}

// 2. Se for Base64 (data:image/...)
if (strpos($image_data, 'data:image') === 0) {
    list($type, $b64) = explode(';', $image_data);
    list(, $b64)      = explode(',', $b64);
    $binary = base64_decode($b64);
    $mime = str_replace('data:', '', $type);
    
    header("Content-Type: " . ($mime ?: 'image/jpeg'));
    header("Content-Length: " . strlen($binary));
    header("Cache-Control: public, max-age=86400");
    header("Access-Control-Allow-Origin: *");
    echo $binary;
    exit;
}

// 3. Se for link HTTP / HTTPS, baixa via cURL e serve diretamente (evitando 302 redirect que o WhatsApp rejeita)
if (strpos($image_data, 'http') === 0) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $image_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_REFERER, $image_data);
    $imageData = curl_exec($ch);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $imageData && strlen($imageData) > 200) {
        if (!$contentType || strpos($contentType, 'image') === false) {
            $contentType = 'image/jpeg';
        }
        header("Content-Type: " . $contentType);
        header("Content-Length: " . strlen($imageData));
        header("Cache-Control: public, max-age=86400");
        header("Access-Control-Allow-Origin: *");
        echo $imageData;
        exit;
    }
}

serveFallbackImage();

function serveFallbackImage() {
    $logoPath = __DIR__ . '/logo-ng.png';
    if (file_exists($logoPath)) {
        header("Content-Type: image/png");
        header("Content-Length: " . filesize($logoPath));
        header("Cache-Control: public, max-age=86400");
        header("Access-Control-Allow-Origin: *");
        readfile($logoPath);
        exit;
    }
    header('Location: https://portalngbrasil.com.br/logo-ng.png');
    exit;
}
