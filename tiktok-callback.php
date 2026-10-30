<?php
// =============================================================================
// Callback Oficial OAuth 2.0 do TikTok - Portal NG Brasil (Hostinger Zero Custo)
// Recebe a autorização do TikTok e armazena os tokens
// =============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

$CLIENT_KEY = "awpunzxl9e81n4vp";
$CLIENT_SECRET = "YLgy30z0b6pj1oXUzvG5wNbl0aCCPsqX";
$REDIRECT_URI = "https://portalngbrasil.com.br/tiktok-callback.php";

$code = isset($_GET['code']) ? trim($_GET['code']) : '';
$error = isset($_GET['error']) ? trim($_GET['error']) : '';
$errorDesc = isset($_GET['error_description']) ? trim($_GET['error_description']) : '';

if (!empty($error)) {
    echo "<!DOCTYPE html><html><body style='background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:40px;'>";
    echo "<h2 style='color:#ef4444;'>Erro na autorização do TikTok</h2>";
    echo "<p>" . htmlspecialchars($errorDesc ?: $error) . "</p>";
    echo "<p><button onclick='window.close();' style='padding:10px 20px;cursor:pointer;'>Fechar</button></p>";
    echo "</body></html>";
    exit();
}

if (empty($code)) {
    echo "<!DOCTYPE html><html><body style='background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:40px;'>";
    echo "<h2>Aguardando código de autorização do TikTok...</h2>";
    echo "</body></html>";
    exit();
}

// 1. Troca o código pelo token via cURL
$ch = curl_init("https://open.tiktokapis.com/v2/oauth/token/");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["Content-Type: application/x-www-form-urlencoded"],
    CURLOPT_POSTFIELDS => http_build_query([
        'client_key' => $CLIENT_KEY,
        'client_secret' => $CLIENT_SECRET,
        'code' => $code,
        'grant_type' => 'authorization_code',
        'redirect_uri' => $REDIRECT_URI
    ]),
    CURLOPT_TIMEOUT => 20
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$tokenData = json_decode($response, true);

if (!isset($tokenData['data']['access_token'])) {
    echo "<!DOCTYPE html><html><body style='background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:40px;'>";
    echo "<h2 style='color:#ef4444;'>Falha ao resgatar token do TikTok</h2>";
    echo "<pre style='text-align:left;display:inline-block;background:#1e293b;padding:16px;border-radius:8px;'>" . htmlspecialchars($response) . "</pre>";
    echo "<p><button onclick='window.close();' style='padding:10px 20px;cursor:pointer;'>Fechar</button></p>";
    echo "</body></html>";
    exit();
}

$accessToken = $tokenData['data']['access_token'];
$refreshToken = $tokenData['data']['refresh_token'];
$expiresIn = isset($tokenData['data']['expires_in']) ? intval($tokenData['data']['expires_in']) : 86400;
$refreshExpiresIn = isset($tokenData['data']['refresh_expires_in']) ? intval($tokenData['data']['refresh_expires_in']) : 31536000;
$openId = isset($tokenData['data']['open_id']) ? $tokenData['data']['open_id'] : '';

// 2. Busca informações do perfil conectado
$username = 'portalngbrasil';
$displayName = 'Portal NG Brasil';
$avatarUrl = '';

$chUser = curl_init("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username");
curl_setopt_array($chUser, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer {$accessToken}"],
    CURLOPT_TIMEOUT => 15
]);
$userRes = curl_exec($chUser);
curl_close($chUser);
$userData = json_decode($userRes, true);

if (isset($userData['data']['user'])) {
    $u = $userData['data']['user'];
    if (!empty($u['username'])) $username = $u['username'];
    if (!empty($u['display_name'])) $displayName = $u['display_name'];
    if (!empty($u['avatar_url'])) $avatarUrl = $u['avatar_url'];
}

// 3. Salva os tokens no arquivo local protegido do servidor
$tokenPayload = [
    'accessToken' => $accessToken,
    'refreshToken' => $refreshToken,
    'expiresAt' => (time() + $expiresIn) * 1000,
    'refreshExpiresAt' => (time() + $refreshExpiresIn) * 1000,
    'openId' => $openId,
    'username' => $username,
    'displayName' => $displayName,
    'avatarUrl' => $avatarUrl,
    'connectedAt' => date('c'),
    'updatedAt' => date('c')
];

$storagePath = __DIR__ . '/tiktok-tokens.json';
file_put_contents($storagePath, json_encode($tokenPayload, JSON_PRETTY_PRINT));

// 4. Salva também no Firestore via REST API para sincronizar com o painel React
try {
    $firestoreUrl = "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/settings/tiktok";
    $fsBody = json_encode([
        'fields' => [
            'accessToken' => ['stringValue' => $accessToken],
            'refreshToken' => ['stringValue' => $refreshToken],
            'expiresAt' => ['integerValue' => (string)((time() + $expiresIn) * 1000)],
            'openId' => ['stringValue' => $openId],
            'username' => ['stringValue' => $username],
            'displayName' => ['stringValue' => $displayName],
            'avatarUrl' => ['stringValue' => $avatarUrl],
            'updatedAt' => ['stringValue' => date('c')]
        ]
    ]);

    $chFs = curl_init($firestoreUrl . "?updateMask.fieldPaths=accessToken&updateMask.fieldPaths=refreshToken&updateMask.fieldPaths=expiresAt&updateMask.fieldPaths=username&updateMask.fieldPaths=displayName&updateMask.fieldPaths=avatarUrl&updateMask.fieldPaths=updatedAt");
    curl_setopt_array($chFs, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
        CURLOPT_POSTFIELDS => $fsBody,
        CURLOPT_TIMEOUT => 10
    ]);
    curl_exec($chFs);
    curl_close($chFs);
} catch (Exception $e) {
    // Silencioso se Firestore falhar
}

?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TikTok Conectado com Sucesso! - Portal NG Brasil</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .icon-badge {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      box-shadow: 0 0 30px rgba(0, 242, 254, 0.4);
    }
    h1 {
      font-size: 22px;
      margin: 0 0 10px;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #1e293b;
      padding: 8px 16px;
      border-radius: 9999px;
      border: 1px solid #334155;
      font-size: 13px;
      font-weight: 600;
      color: #38bdf8;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: #d40a38;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-badge">✓</div>
    <h1>TikTok Conectado!</h1>
    <p>Conta autorizada com sucesso pelo TikTok for Developers do Portal NG Brasil.</p>
    <div class="user-chip">
      <span>@<?php echo htmlspecialchars($username); ?></span>
    </div>
    <button class="btn" onclick="window.close();">Fechar Janela</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'TIKTOK_AUTH_SUCCESS', username: '<?php echo addslashes($username); ?>' }, '*');
    }
  </script>
</body>
</html>
