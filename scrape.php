<?php
// Proxy script to fetch external content (bypassing CORS on Hostinger)
// Usage: /scrape.php?url=https://example.com

// Allow requests from anywhere (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$url = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo "URL inválida ou ausente.";
    exit();
}

// User-Agent to prevent getting blocked by some sites
$options = [
    'http' => [
        'method' => "GET",
        'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36\r\n"
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
    ]
];

$context = stream_context_create($options);

try {
    $content = file_get_contents($url, false, $context);
    
    if ($content === false) {
        http_response_code(500);
        echo "Falha ao obter conteúdo da URL fornecida.";
    } else {
        header("Content-Type: text/html; charset=UTF-8");
        echo $content;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo "Erro: " . $e->getMessage();
}
?>
