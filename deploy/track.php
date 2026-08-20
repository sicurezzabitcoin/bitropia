<?php
/**
 * Bitropia — registra una compilazione completata (utente arrivato all'esito).
 * Copia versionata di .../bitropia/track.php sul server.
 *
 * Richiede login WP + accesso a Bitropia (stesso gate di index.php), così solo
 * gli studenti possono incrementare il contatore.
 */
require_once __DIR__ . '/../comparativa/auth.php';

header( 'Content-Type: application/json; charset=utf-8' );

if ( $_SERVER['REQUEST_METHOD'] !== 'POST' ) {
    http_response_code( 405 );
    echo json_encode( array( 'status' => 'method_not_allowed' ) );
    exit;
}

if ( ! is_user_logged_in() ) {
    http_response_code( 401 );
    echo json_encode( array( 'status' => 'not_logged_in' ) );
    exit;
}

$bitropia_product_ids = array( 24, 600, 1193, 2598, 3457 );
$has_access = false;
foreach ( $bitropia_product_ids as $pid ) {
    if ( comparativa_user_has_access( get_current_user_id(), $pid ) ) {
        $has_access = true;
        break;
    }
}
if ( ! $has_access ) {
    http_response_code( 403 );
    echo json_encode( array( 'status' => 'forbidden' ) );
    exit;
}

$allowed_wallets = array( 'coldcard', 'bitbox02', 'seedsigner' );
$body   = json_decode( file_get_contents( 'php://input' ), true );
$wallet = ( is_array( $body ) && isset( $body['wallet'] ) && in_array( $body['wallet'], $allowed_wallets, true ) )
    ? $body['wallet']
    : 'altro';

$path = __DIR__ . '/completions.json';
$data = file_exists( $path ) ? json_decode( file_get_contents( $path ), true ) : array();
if ( ! is_array( $data ) ) {
    $data = array();
}
if ( ! isset( $data['total'] ) ) {
    $data['total'] = 0;
}
if ( ! isset( $data['by_wallet'] ) || ! is_array( $data['by_wallet'] ) ) {
    $data['by_wallet'] = array();
}
$data['total']++;
$data['by_wallet'][ $wallet ] = ( isset( $data['by_wallet'][ $wallet ] ) ? (int) $data['by_wallet'][ $wallet ] : 0 ) + 1;
$data['updated'] = gmdate( 'c' );

// Scrittura atomica (tmp + rename), come data.json della comparativa.
$tmp  = $path . '.tmp';
$json = json_encode( $data, JSON_PRETTY_PRINT );
if ( $json !== false && file_put_contents( $tmp, $json, LOCK_EX ) !== false ) {
    rename( $tmp, $path );
}

echo json_encode( array( 'status' => 'ok' ) );
