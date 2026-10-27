<?php
// Script de upload público para Portal NG Brasil
// Permite que o frontend hospede artes de notícias para publicação no Instagram e Facebook
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(["success" => false, "error" => "Método não permitido"]);
    exit();
}

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// Limpeza de imagens temporárias com mais de 5 dias para não acumular espaço
if (is_dir($uploadDir)) {
    $files = @glob($uploadDir . '*');
    $now = time();
    if ($files) {
        foreach ($files as $file) {
            if (is_file($file) && ($now - @filemtime($file) > 5 * 86400)) {
                @unlink($file);
            }
        }
    }
}

$imageContent = null;
$ext = 'jpg';

// Caso 1: Envio via FormData (multipart/form-data)
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $imageContent = file_get_contents($_FILES['image']['tmp_name']);
    $origName = $_FILES['image']['name'];
    $pathParts = pathinfo($origName);
    if (!empty($pathParts['extension'])) {
        $cleanExt = strtolower($pathParts['extension']);
        if (in_array($cleanExt, ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm', 'm4v'])) {
            $ext = $cleanExt;
        }
    }
} else if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $imageContent = file_get_contents($_FILES['file']['tmp_name']);
    $origName = $_FILES['file']['name'];
    $pathParts = pathinfo($origName);
    if (!empty($pathParts['extension'])) {
        $cleanExt = strtolower($pathParts['extension']);
        if (in_array($cleanExt, ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm', 'm4v'])) {
            $ext = $cleanExt;
        }
    }
} else {
    // Caso 2: Envio via JSON { image: "data:image/jpeg;base64,..." } ou POST body raw
    $rawInput = file_get_contents('php://input');
    if ($rawInput) {
        $json = json_decode($rawInput, true);
        $data = ($json && isset($json['image'])) ? $json['image'] : $rawInput;
        
        if (strpos($data, 'data:image') === 0 || strpos($data, 'data:video') === 0) {
            $parts = explode(';', $data);
            if (count($parts) > 1) {
                if (strpos($parts[0], 'png') !== false) $ext = 'png';
                if (strpos($parts[0], 'webp') !== false) $ext = 'webp';
                if (strpos($parts[0], 'mp4') !== false) $ext = 'mp4';
                if (strpos($parts[0], 'quicktime') !== false || strpos($parts[0], 'mov') !== false) $ext = 'mov';
                if (strpos($parts[0], 'webm') !== false) $ext = 'webm';
                $dataParts = explode(',', $parts[1]);
                if (count($dataParts) > 1) {
                    $data = $dataParts[1];
                }
            }
        }
        $decoded = base64_decode($data);
        if ($decoded !== false && strlen($decoded) > 50) {
            $imageContent = $decoded;
        }
    }
}

if (!$imageContent) {
    http_response_code(400);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(["success" => false, "error" => "Nenhuma imagem válida recebida"]);
    exit();
}

$filename = 'post_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$targetPath = $uploadDir . $filename;

if (@file_put_contents($targetPath, $imageContent) !== false) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
    $host = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'portalngbrasil.com.br';
    $publicUrl = $protocol . $host . '/uploads/' . $filename;
    
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "success" => true,
        "url" => $publicUrl,
        "filename" => $filename
    ]);
    exit();
}

// Fallback: Se não conseguir gravar localmente no disco, envia via cURL para o Catbox
if (function_exists('curl_init')) {
    $tmpFile = tempnam(sys_get_temp_dir(), 'post_');
    if ($tmpFile) {
        file_put_contents($tmpFile, $imageContent);
        $cfile = new CURLFile($tmpFile, 'image/jpeg', 'post.jpg');
        $ch = curl_init('https://catbox.moe/user/api.php');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, [
            'reqtype' => 'fileupload',
            'fileToUpload' => $cfile
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        $res = curl_exec($ch);
        curl_close($ch);
        @unlink($tmpFile);
        
        if ($res && strpos($res, 'http') === 0) {
            header("Content-Type: application/json; charset=UTF-8");
            echo json_encode([
                "success" => true,
                "url" => trim($res)
            ]);
            exit();
        }
    }
}

http_response_code(500);
header("Content-Type: application/json; charset=UTF-8");
echo json_encode(["success" => false, "error" => "Falha ao gravar arquivo em uploads/"]);
exit();
