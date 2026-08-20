<?php
/**
 * Bitropia — numero di compilazioni completate, visibile solo all'admin.
 * Copia versionata di .../bitropia/stats.php sul server.
 *
 * comparativa_require_admin_api risponde 401 (non loggato) o 403 (non admin)
 * in JSON; l'app mostra il contatore solo quando riceve 200.
 */
require_once __DIR__ . '/../comparativa/auth.php';

comparativa_require_admin_api();

$path = __DIR__ . '/completions.json';
$data = file_exists( $path ) ? json_decode( file_get_contents( $path ), true ) : array();
if ( ! is_array( $data ) ) {
    $data = array();
}

echo json_encode( array(
    'total'     => isset( $data['total'] ) ? (int) $data['total'] : 0,
    'by_wallet' => ( isset( $data['by_wallet'] ) && is_array( $data['by_wallet'] ) && $data['by_wallet'] )
        ? $data['by_wallet']
        : new stdClass(),
) );
