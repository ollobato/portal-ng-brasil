<?php
// =============================================================================
// Endpoint Comercial (/api/leads -> /leads.php) — Portal NG Brasil
// Valida e grava leads da landing /anuncie/ na coleção `commercial_leads` do Firestore.
// =============================================================================

error_reporting(0);
ini_set('display_errors', 0);

header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');

$allowedOrigins = [
    'https://www.portalngbrasil.com.br',
    'https://portalngbrasil.com.br',
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
$isLocal = preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $host);

if (!$origin || (!in_array($origin, $allowedOrigins, true) && !$isLocal)) {
    http_response_code(403);
    echo json_encode(['error' => 'Origem inválida.']);
    exit();
}

header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);
    exit();
}

$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
if (stripos($contentType, 'application/json') === false) {
    http_response_code(415);
    echo json_encode(['error' => 'Formato inválido.']);
    exit();
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 12000) {
    http_response_code(413);
    echo json_encode(['error' => 'Briefing muito longo.']);
    exit();
}

$input = json_decode($rawBody, true);
if (!is_array($input) || array_keys($input) === range(0, count($input) - 1) || !empty($input['websiteTrap'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos.']);
    exit();
}

function clean_field($arr, $key, $max) {
    if (!isset($arr[$key]) || !is_string($arr[$key])) return '';
    return mb_substr(trim($arr[$key]), 0, $max, 'UTF-8');
}

$goals = ['Conhecimento da marca', 'Visitas e contatos', 'Vendas de um produto', 'Patrocínio recorrente'];
$requestId = clean_field($input, 'requestId', 36);
$name      = clean_field($input, 'name', 100);
$company   = clean_field($input, 'company', 180);
$email     = clean_field($input, 'email', 180);
$phoneRaw  = clean_field($input, 'phone', 30);
$phone     = preg_replace('/[^0-9+()\-\s]/', '', $phoneRaw);
$goal      = clean_field($input, 'goal', 50);
$region    = clean_field($input, 'region', 100);
$budget    = clean_field($input, 'budget', 50);
$message   = clean_field($input, 'message', 1500);

if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $requestId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Identificador de envio inválido.']);
    exit();
}
if (mb_strlen($name, 'UTF-8') < 2 || mb_strlen($company, 'UTF-8') < 2) {
    http_response_code(400);
    echo json_encode(['error' => 'Informe seu nome e sua empresa.']);
    exit();
}
if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Informe um e-mail válido.']);
    exit();
}
$phoneDigits = preg_replace('/\D/', '', $phone);
if ($phone !== '' && !preg_match('/^\d{10,15}$/', $phoneDigits)) {
    http_response_code(400);
    echo json_encode(['error' => 'Informe um WhatsApp válido com DDD ou deixe em branco.']);
    exit();
}
if (!in_array($goal, $goals, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Escolha o objetivo da campanha.']);
    exit();
}
if (!isset($input['consent']) || $input['consent'] !== true) {
    http_response_code(400);
    echo json_encode(['error' => 'Autorize o contato sobre a proposta.']);
    exit();
}

$utmFields = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as $utmKey) {
    if (isset($input['utm'][$utmKey]) && is_string($input['utm'][$utmKey])) {
        $utmFields[$utmKey] = ['stringValue' => mb_substr($input['utm'][$utmKey], 0, 180, 'UTF-8')];
    }
}

$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$bucket = floor(time() / 3600);
$rateHash = hash('sha256', $ip . ':' . $bucket);
$rateDir = sys_get_temp_dir() . '/portalng_commercial_leads';
if (!is_dir($rateDir)) @mkdir($rateDir, 0700, true);

$receiptFile = $rateDir . '/id_' . strtolower($requestId);
if (file_exists($receiptFile)) {
    http_response_code(200);
    echo json_encode(['id' => $requestId]);
    exit();
}

$rateFile = $rateDir . '/rl_' . $rateHash;
$count = file_exists($rateFile) ? (int)@file_get_contents($rateFile) : 0;
if ($count >= 5) {
    http_response_code(429);
    echo json_encode(['error' => 'Muitas solicitações. Tente novamente mais tarde.']);
    exit();
}

$projectId = 'portal-ng-brasil';
$nowIso = gmdate('Y-m-d\TH:i:s\Z');
$docName = "projects/{$projectId}/databases/(default)/documents/commercial_leads/{$requestId}";

$commitPayload = [
    'writes' => [[
        'update' => [
            'name' => $docName,
            'fields' => [
                'requestId'      => ['stringValue' => $requestId],
                'name'           => ['stringValue' => $name],
                'company'        => ['stringValue' => $company],
                'email'          => ['stringValue' => $email],
                'phone'          => ['stringValue' => $phone],
                'goal'           => ['stringValue' => $goal],
                'region'         => ['stringValue' => $region],
                'budget'         => ['stringValue' => $budget],
                'message'        => ['stringValue' => $message],
                'consent'        => ['booleanValue' => true],
                'consentVersion' => ['stringValue' => 'commercial-contact-v1'],
                'offer'          => ['stringValue' => 'piloto-1990'],
                'utm'            => ['mapValue' => ['fields' => (object)$utmFields]],
                'status'         => ['stringValue' => 'novo'],
                'activity'       => ['arrayValue' => (object)[]],
                'createdAt'      => ['timestampValue' => $nowIso],
                'updatedAt'      => ['timestampValue' => $nowIso],
            ],
        ],
        'currentDocument' => ['exists' => false],
    ]],
];

$url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents:commit";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($commitPayload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$resBody = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    @file_put_contents($receiptFile, $nowIso);
    @file_put_contents($rateFile, (string)($count + 1));
    http_response_code(201);
    echo json_encode(['id' => $requestId]);
    exit();
}

http_response_code(503);
echo json_encode(['error' => 'Não foi possível salvar. Tente novamente.']);
