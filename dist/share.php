<?php
error_reporting(0);
ini_set('display_errors', 0);

$id = isset($_GET['id']) ? trim($_GET['id']) : '';

if (!$id) {
    header('Location: /');
    exit;
}

// Suporte a IDs com ou sem o prefixo 'news-'
$cleanId = preg_replace('/^news-/', '', $id);
$prefixedId = 'news-' . $cleanId;

$idsToTry = array_unique([$id, $cleanId, $prefixedId]);

$endpoints = [];
foreach ($idsToTry as $candidateId) {
    if (!empty($candidateId)) {
        $endpoints[] = "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/news/" . urlencode($candidateId);
        $endpoints[] = "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/drafts/" . urlencode($candidateId);
    }
}

$title = isset($_GET['t']) && !empty($_GET['t']) ? trim($_GET['t']) : "Portal NG Brasil | As notícias que impactam o país e o mundo.";
$description = isset($_GET['desc']) && !empty($_GET['desc']) ? trim($_GET['desc']) : "As notícias que impactam o país e o mundo.";

foreach ($endpoints as $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if (isset($data['fields'])) {
            $f = $data['fields'];
            if (isset($f['title']['stringValue']) && !empty($f['title']['stringValue'])) {
                $title = $f['title']['stringValue'];
            } elseif (isset($f['metadata']['mapValue']['fields']['titulo_original']['stringValue'])) {
                $title = $f['metadata']['mapValue']['fields']['titulo_original']['stringValue'];
            }
            if (isset($f['subtitle']['stringValue']) && !empty($f['subtitle']['stringValue'])) {
                $description = $f['subtitle']['stringValue'];
            } elseif (isset($f['metadata']['mapValue']['fields']['subtitulo_original']['stringValue'])) {
                $description = $f['metadata']['mapValue']['fields']['subtitulo_original']['stringValue'];
            }
            break;
        }
    }
}

// Imagem oficial servida pelo script image.php
$imageUrl = "https://portalngbrasil.com.br/image.php?id=" . urlencode($id);

// Se passado parâmetro direto de fallback de imagem
if (isset($_GET['img']) && !empty($_GET['img']) && strpos($_GET['img'], 'http') === 0) {
    $imageUrl = $_GET['img'];
}

// URL canônica
$canonicalUrl = "https://portalngbrasil.com.br/share.php?id=" . urlencode($id);
$targetUrl = "https://portalngbrasil.com.br/#/noticia/" . urlencode($id);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title) ?></title>
    
    <!-- Meta tags Open Graph (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:site_name" content="Portal NG Brasil">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:type" content="article">
    <meta property="og:url" content="<?= htmlspecialchars($canonicalUrl) ?>">
    <meta property="og:title" content="<?= htmlspecialchars($title) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($description) ?>">
    <meta property="og:image" content="<?= htmlspecialchars($imageUrl) ?>">
    <meta property="og:image:secure_url" content="<?= htmlspecialchars($imageUrl) ?>">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Meta tags Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= htmlspecialchars($title) ?>">
    <meta name="twitter:description" content="<?= htmlspecialchars($description) ?>">
    <meta name="twitter:image" content="<?= htmlspecialchars($imageUrl) ?>">

    <script>
        // Redireciona usuários reais para a matéria no React App
        window.location.href = "<?= $targetUrl ?>";
    </script>
</head>
<body>
    <p>Redirecionando para a matéria no Portal NG Brasil... <a href="<?= $targetUrl ?>">Clique aqui</a> se não for redirecionado automaticamente.</p>
</body>
</html>
