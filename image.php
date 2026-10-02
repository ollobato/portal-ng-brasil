<?php
$id = isset($_GET['id']) ? $_GET['id'] : '';

if (!$id) {
    header('HTTP/1.1 404 Not Found');
    exit;
}

// Buscar dados da notícia no Firestore REST API
$url = "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/news/" . urlencode($id);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
$image_data = "";

if (isset($data['fields']) && isset($data['fields']['image']['stringValue'])) {
    $image_data = $data['fields']['image']['stringValue'];
}

// Se for um link HTTP normal, redirecionar para ele
if (strpos($image_data, 'http') === 0) {
    header('Location: ' . $image_data);
    exit;
}

// Se for Base64, decodificar e exibir como imagem
if (strpos($image_data, 'data:image') === 0) {
    // Separar o tipo MIME e os dados
    list($type, $data) = explode(';', $image_data);
    list(, $data)      = explode(',', $data);
    $data = base64_decode($data);
    
    // Obter tipo MIME (ex: image/jpeg)
    $type = str_replace('data:', '', $type);
    
    header("Content-Type: " . $type);
    header("Content-Length: " . strlen($data));
    header("Cache-Control: max-age=86400, public");
    echo $data;
    exit;
}

// Se não tiver imagem ou for inválida, mostrar imagem padrão
$placeholder = 'https://portalngbrasil.com.br/assets/placeholder.jpg';
header('Location: ' . $placeholder);
exit;
