<?php

/**
 * Plugin Name: Infinite Scroll Plugin
 * Description: infinite scroll
 * Version: 1.0.0
 * Author: Cigar Chief
 */

if (!defined('ABSPATH')) exit;

add_action('wp_enqueue_scripts', function () {
    $handle = 'infinite-scroll-plugin-js';

    wp_enqueue_script(
        $handle,
        plugins_url('assets/js/infinite-scroll-plugin.js', __FILE__),
        array(),
        '1.0.0',
        true
    );

    $opts = get_option('infinite_scroll_plugin_options');
    $thresholdPx = isset($opts['thresholdPx']) ? max(0, intval($opts['thresholdPx'])) : 800;
    $targetList  = isset($opts['targetList']) ? $opts['targetList'] : '#main > ul';
    $doneMessage = isset($opts['doneMessage']) ? $opts['doneMessage'] : 'No more products to display.';

    wp_localize_script($handle, 'InfiniteScrollSettings', array(
        'thresholdPx' => $thresholdPx,
        'targetList'  => $targetList,
        'doneMessage' => $doneMessage,
    ));
});

add_action('admin_menu', function () {
    add_options_page('Infinite Scroll', 'Infinite Scroll', 'manage_options', 'infinite_scroll_plugin', function () {
        if (isset($_POST['infinite_scroll_plugin_save']) && check_admin_referer('infinite_scroll_plugin_save')) {
            $opts = array(
                'thresholdPx' => isset($_POST['thresholdPx']) ? max(0, intval($_POST['thresholdPx'])) : 800,
                'targetList'  => isset($_POST['targetList']) ? sanitize_text_field($_POST['targetList']) : '#main > ul',
                'doneMessage' => isset($_POST['doneMessage']) ? sanitize_text_field($_POST['doneMessage']) : 'No more products to display.',
            );
            update_option('infinite_scroll_plugin_options', $opts);
            echo '<div class="updated"><p>Settings saved.</p></div>';
        }

        $opts = get_option('infinite_scroll_plugin_options', array(
            'thresholdPx' => 800,
            'targetList'  => '#main > ul',
            'doneMessage' => 'No more products to display.',
        ));
?>
        <div class="wrap">
            <h1>Infinite Scroll</h1>
            <form method="post">
                <?php wp_nonce_field('infinite_scroll_plugin_save'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="thresholdPx">Threshold (px)</label></th>
                        <td><input name="thresholdPx" id="thresholdPx" type="number" min="0" value="<?php echo esc_attr($opts['thresholdPx']); ?>" class="small-text"> <span class="description">Load earlier by increasing this value.</span></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="targetList">Target List Selector</label></th>
                        <td><input name="targetList" id="targetList" type="text" value="<?php echo esc_attr($opts['targetList']); ?>" class="regular-text"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="doneMessage">Done Message</label></th>
                        <td><input name="doneMessage" id="doneMessage" type="text" value="<?php echo esc_attr($opts['doneMessage']); ?>" class="regular-text"></td>
                    </tr>
                </table>
                <p class="submit">
                    <button type="submit" name="infinite_scroll_plugin_save" class="button button-primary">Save Changes</button>
                </p>
            </form>
        </div>
<?php
    });
});
