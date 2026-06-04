<?php
header('X-LiteSpeed-Purge: *');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
echo 'Cache purged at ' . date('Y-m-d H:i:s');
?>
