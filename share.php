<?php
$id = isset($_GET['id']) ? $_GET['id'] : '';

if (!$id) {
    header('Location: /');
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

$title = "Portal NG Brasil | Jornalismo de Verdade";
$description = "As notícias que impactam o país e o mundo.";
$image = "https://portalngbrasil.com.br/assets/placeholder.jpg"; // Substituir por imagem padrão real se existir

if (isset($data['fields'])) {
    if (isset($data['fields']['title']['stringValue'])) {
        $title = $data['fields']['title']['stringValue'];
    }
    if (isset($data['fields']['subtitle']['stringValue'])) {
        $description = $data['fields']['subtitle']['stringValue'];
    }
    if (isset($data['fields']['image']['stringValue'])) {
        $image = $data['fields']['image']['stringValue'];
    }
}

// O URL final que o usuário deve acessar (com a # do React Router)
$targetUrl = "https://portalngbrasil.com.br/#/noticia/" . htmlspecialchars($id);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title) ?></title>
    
    <!-- Meta tags Open Graph (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:title" content="<?= htmlspecialchars($title) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($description) ?>">
    <meta property="og:image" content="https://portalngbrasil.com.br/image.php?id=<?= htmlspecialchars($id) ?>">
    <meta property="og:url" content="https://portalngbrasil.com.br/share.php?id=<?= htmlspecialchars($id) ?>">
    <meta property="og:type" content="article">
    
    <!-- Meta tags Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= htmlspecialchars($title) ?>">
    <meta name="twitter:description" content="<?= htmlspecialchars($description) ?>">
    <meta name="twitter:image" content="https://portalngbrasil.com.br/image.php?id=<?= htmlspecialchars($id) ?>">

    <script>
        // Redireciona usuários reais para a matéria no React App
        window.location.href = "<?= $targetUrl ?>";
    </script>
</head>
<body>
    <p>Redirecionando para a matéria... <a href="<?= $targetUrl ?>">Clique aqui</a> se não for redirecionado.</p>
</body>
</html>
