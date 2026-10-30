<?php
// Script de Pré-Visualização Dinâmica para Aprovação e Compartilhamento de Matérias
// Injeta meta tags Open Graph (WhatsApp, Facebook, Twitter) no index.html do React

error_reporting(0);
ini_set('display_errors', 0);

header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

$id = isset($_GET['id']) ? trim($_GET['id']) : '';

// Valores padrão
$title = "Portal NG Brasil | Aprovação de Matéria";
$description = "Acesse o Portal NG Brasil para revisar, aprovar e publicar esta matéria.";
$image = "https://www.portalngbrasil.com.br/logo-ng.png";

if ($id) {
    // 1. Tentar buscar primeiro em 'drafts' (rascunhos pendentes de aprovação), depois em 'news'
    $endpoints = [
        "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/drafts/" . urlencode($id),
        "https://firestore.googleapis.com/v1/projects/portal-ng-brasil/databases/(default)/documents/news/" . urlencode($id)
    ];

    foreach ($endpoints as $url) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 4);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $res) {
            $json = json_decode($res, true);
            if (isset($json['fields'])) {
                $fields = $json['fields'];
                
                // Título da matéria
                if (!empty($fields['title']['stringValue'])) {
                    $title = $fields['title']['stringValue'];
                }
                
                // Subtítulo / Descrição
                if (!empty($fields['subtitle']['stringValue'])) {
                    $description = $fields['subtitle']['stringValue'];
                } elseif (!empty($fields['originalSubtitle']['stringValue'])) {
                    $description = $fields['originalSubtitle']['stringValue'];
                }

                // Imagem da matéria
                $hasImage = false;
                if (!empty($fields['image']['stringValue'])) {
                    $hasImage = true;
                } elseif (!empty($fields['metadata']['mapValue']['fields']['imagem']['stringValue'])) {
                    $hasImage = true;
                }

                if ($hasImage) {
                    $image = "https://www.portalngbrasil.com.br/imagem-materia/" . urlencode($id) . ".jpg";
                }
                
                break;
            }
        }
    }
}

// Carregar index.html da aplicação
$indexPath = __DIR__ . '/index.html';
if (!file_exists($indexPath)) {
    $indexPath = __DIR__ . '/../dist/index.html';
}

$html = file_exists($indexPath) ? file_get_contents($indexPath) : '';

$requestUri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : ("/aprovacao/" . $id);
$canonicalUrl = "https://www.portalngbrasil.com.br" . $requestUri;

$cleanTitle = htmlspecialchars(trim($title), ENT_QUOTES, 'UTF-8');
$cleanDesc = htmlspecialchars(trim($description), ENT_QUOTES, 'UTF-8');
$cleanImage = htmlspecialchars(trim($image), ENT_QUOTES, 'UTF-8');

$ogTags = <<<HTML
    <title>{$cleanTitle}</title>
    <meta name="description" content="{$cleanDesc}" />

    <!-- Open Graph / WhatsApp / Facebook Preview -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Portal NG Brasil" />
    <meta property="og:url" content="{$canonicalUrl}" />
    <meta property="og:title" content="{$cleanTitle}" />
    <meta property="og:description" content="{$cleanDesc}" />
    <meta property="og:image" content="{$cleanImage}" />
    <meta property="og:image:secure_url" content="{$cleanImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="{$cleanTitle}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="{$canonicalUrl}" />
    <meta name="twitter:title" content="{$cleanTitle}" />
    <meta name="twitter:description" content="{$cleanDesc}" />
    <meta name="twitter:image" content="{$cleanImage}" />
HTML;

if ($html) {
    // Remove title e meta tags antigas estáticas
    $html = preg_replace('/<title>.*?<\/title>/is', '', $html, 1);
    $html = preg_replace('/<meta\s+property=["\']og:[^"\']+["\'][^>]*>/is', '', $html);
    $html = preg_replace('/<meta\s+property=["\']twitter:[^"\']+["\'][^>]*>/is', '', $html);
    $html = preg_replace('/<meta\s+name=["\']twitter:[^"\']+["\'][^>]*>/is', '', $html);
    $html = preg_replace('/<meta\s+name=["\']description["\'][^>]*>/is', '', $html);

    // Injeta as novas tags dinâmicas logo após o <head>
    $html = preg_replace('/(<head[^>]*>)/i', "$1\n" . $ogTags, $html, 1);
    
    header("Content-Type: text/html; charset=UTF-8");
    echo $html;
    exit;
} else {
    header("Content-Type: text/html; charset=UTF-8");
    echo "<!DOCTYPE html><html><head>" . $ogTags . "</head><body>Redirecionando...<script>window.location.href='/';</script></body></html>";
    exit;
}
