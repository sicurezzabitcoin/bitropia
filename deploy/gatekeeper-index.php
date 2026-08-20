<?php
/**
 * Gatekeeper di Bitropia — copia versionata dell'index.php servito in
 * corsi.sicurezzabitcoin.com/bitropia/ (dentro la docroot del WordPress)
 *
 * Stesso meccanismo della comparativa: riusa auth.php (wp-load.php +
 * comparativa_user_has_access, che copre acquisto diretto e bundle EDD).
 */
require_once __DIR__ . '/../comparativa/auth.php';

// Prodotti EDD che sbloccano Bitropia (acquisto diretto o bundle che li contiene).
$bitropia_product_ids = array(
    24,   // Bitcoin Custodia Sicura
    600,  // Masterclass Coldcard
    1193, // Masterclass Seedsigner
    2598, // BitBox Wallet da A a Z
    3457, // Bitcoin Soluzione Estrema
);

if ( ! is_user_logged_in() ) {
    wp_redirect( wp_login_url( home_url( '/bitropia/' ) ) );
    exit;
}

$has_access = comparativa_current_user_is_admin();
if ( ! $has_access ) {
    foreach ( $bitropia_product_ids as $pid ) {
        if ( comparativa_user_has_access( get_current_user_id(), $pid ) ) {
            $has_access = true;
            break;
        }
    }
}

if ( ! $has_access ) {
    ?>
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bitropia — accesso riservato</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f6f8;
      color: #1c2433;
      margin: 0;
    }
    .accesso-negato {
      max-width: 620px;
      margin: 80px auto;
      padding: 0 20px;
      text-align: center;
    }
    .accesso-negato h2 { margin-bottom: 16px; }
    .accesso-negato p { color: #555; margin-bottom: 28px; line-height: 1.6; }
    .accesso-negato ul { list-style: none; padding: 0; margin: 0 0 8px; }
    .accesso-negato li { margin: 10px 0; }
    .accesso-negato a.btn {
      display: inline-block;
      background: #ff6900;
      color: #fff;
      padding: 12px 28px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      min-width: 280px;
    }
  </style>
</head>
<body>
  <div class="accesso-negato">
    <h2>Bitropia è riservata agli studenti</h2>
    <p>
      Bitropia — il controllo parallelo della generazione del seed con entropia utente — è
      inclusa nei corsi qui sotto. Il tuo account non risulta avere accesso: se pensi sia un
      errore, verifica di aver fatto login con l&rsquo;account usato per l&rsquo;acquisto.
    </p>
    <ul>
      <?php foreach ( $bitropia_product_ids as $pid ) : ?>
      <li>
        <a class="btn" href="<?php echo esc_url( get_permalink( $pid ) ); ?>">
          <?php echo esc_html( get_the_title( $pid ) ); ?>
        </a>
      </li>
      <?php endforeach; ?>
    </ul>
  </div>
</body>
</html>
    <?php
    exit;
}

// Accesso consentito: servi la app. app.html non è raggiungibile direttamente
// via HTTP (regola nginx), esattamente come data.json della comparativa.
readfile( __DIR__ . '/app.html' );
