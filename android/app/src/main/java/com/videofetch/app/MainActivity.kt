package com.videofetch.app

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {

    companion object {
        private const val PREFS = "videofetch_prefs"
        private const val KEY_SERVER = "server_url"
        private const val ASSET_INDEX = "file:///android_asset/web/index.html"
        private const val REQ_PERMISSION_CODE = 101
    }

    private lateinit var prefs: SharedPreferences
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var customViewContainer: FrameLayout

    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var downloadCompleteReceiver: BroadcastReceiver? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        webView = findViewById(R.id.webview)
        progressBar = findViewById(R.id.progress)
        customViewContainer = findViewById(R.id.fullscreen_custom_view)

        requestRequiredPermissions()
        registerMediaScannerReceiver()
        configureWebView()

        // Load local asset index directly so no VPS is ever mandatory to start
        val savedServer = prefs.getString(KEY_SERVER, "")
        if (!savedServer.isNullOrBlank() && (savedServer.startsWith("http://") || savedServer.startsWith("https://"))) {
            webView.loadUrl(savedServer)
        } else {
            webView.loadUrl(ASSET_INDEX)
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
            if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }
        if (permissions.isNotEmpty()) {
            requestPermissions(permissions.toTypedArray(), REQ_PERMISSION_CODE)
        }
    }

    private fun registerMediaScannerReceiver() {
        downloadCompleteReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (DownloadManager.ACTION_DOWNLOAD_COMPLETE == intent?.action) {
                    val downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
                    if (downloadId != -1L && context != null) {
                        try {
                            val dm = context.getSystemService(DownloadManager::class.java)
                            val query = DownloadManager.Query().setFilterById(downloadId)
                            val cursor = dm?.query(query)
                            if (cursor != null && cursor.moveToFirst()) {
                                val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                                val status = if (statusIndex != -1) cursor.getInt(statusIndex) else -1

                                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                    val uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                                    val uriString = if (uriIndex != -1) cursor.getString(uriIndex) else null
                                    if (!uriString.isNullOrEmpty()) {
                                        val uri = Uri.parse(uriString)
                                        val filePath = if (uri.scheme == "file") uri.path ?: "" else ""
                                        if (filePath.isNotEmpty()) {
                                            val file = File(filePath)
                                            val mimeType = if (file.name.endsWith(".mp3", ignoreCase = true)) "audio/mpeg" else "video/mp4"
                                            MediaScannerConnection.scanFile(
                                                applicationContext,
                                                arrayOf(file.absolutePath),
                                                arrayOf(mimeType)
                                            ) { _, _ -> }
                                        }
                                    }
                                    toast("Download complete! Added to your Gallery 🎬")
                                } else if (status == DownloadManager.STATUS_FAILED) {
                                    val reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON)
                                    val reason = if (reasonIndex != -1) cursor.getInt(reasonIndex) else 0
                                    toast("Download failed (code: $reason)")
                                }
                                cursor.close()
                            }
                        } catch (_: Exception) {}
                    }
                }
            }
        }
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadCompleteReceiver, filter, RECEIVER_EXPORTED)
        } else {
            registerReceiver(downloadCompleteReceiver, filter)
        }
    }

    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(false)
            allowFileAccess = true
            allowContentAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            userAgentString = "$userAgentString VideoFetch/2.0 AndroidNative"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                val uri = request.url ?: return false
                val urlStr = uri.toString()

                if (urlStr.startsWith(ASSET_INDEX) || urlStr.startsWith("file:///android_asset/")) {
                    return false
                }
                val customServer = prefs.getString(KEY_SERVER, "")
                if (!customServer.isNullOrBlank() && urlStr.startsWith(customServer)) {
                    return false
                }
                if (urlStr.contains("youtube.com/embed/") || urlStr.contains("youtube-nocookie.com/embed/")) {
                    return false
                }
                if (urlStr.startsWith("blob:") || urlStr.startsWith("data:") || urlStr.startsWith("javascript:") || urlStr.startsWith("about:")) {
                    return false
                }

                try {
                    if (urlStr.startsWith("intent://")) {
                        val intent = Intent.parseUri(urlStr, Intent.URI_INTENT_SCHEME)
                        if (intent != null) {
                            if (packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null) {
                                startActivity(intent)
                            } else {
                                val fallbackUrl = intent.getStringExtra("browser_fallback_url")
                                if (!fallbackUrl.isNullOrEmpty()) {
                                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl)))
                                }
                            }
                            return true
                        }
                    }
                    val intent = Intent(Intent.ACTION_VIEW, uri)
                    startActivity(intent)
                } catch (e: Exception) {
                    toast("Cannot open link: ${e.message}")
                }
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                progressBar.progress = 0
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?, request: WebResourceRequest?, error: android.webkit.WebResourceError?
            ) {
                if (request?.isForMainFrame == true && error?.errorCode != WebViewClient.ERROR_HOST_LOOKUP) {
                    if (view?.url != ASSET_INDEX) {
                        view?.loadUrl(ASSET_INDEX)
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress >= 100) progressBar.visibility = View.GONE
            }

            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customView != null) {
                    callback?.onCustomViewHidden()
                    return
                }
                customView = view
                customViewCallback = callback
                customViewContainer.addView(
                    view,
                    FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )
                customViewContainer.visibility = View.VISIBLE
                webView.visibility = View.GONE
                window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
            }

            override fun onHideCustomView() {
                if (customView == null) return
                customViewContainer.removeView(customView)
                customView = null
                customViewContainer.visibility = View.GONE
                webView.visibility = View.VISIBLE
                customViewCallback?.onCustomViewHidden()
                customViewCallback = null
                window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
            }
        }

        webView.setDownloadListener { url, userAgent, contentDisposition, _, _ ->
            downloadFile(url, null, contentDisposition, userAgent)
        }

        webView.addJavascriptInterface(JsBridge(), "AndroidDownloader")
    }

    inner class JsBridge {
        @JavascriptInterface
        fun downloadFile(url: String) {
            downloadFileWithTitle(url, null, null)
        }

        @JavascriptInterface
        fun downloadFileWithTitle(url: String, customTitle: String?, mimeType: String?) {
            runOnUiThread {
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    this@MainActivity.downloadFile(url, customTitle, null, webView.settings.userAgentString)
                } else {
                    toast("Invalid download link.")
                }
            }
        }

        @JavascriptInterface
        fun openUrl(url: String) {
            runOnUiThread {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    toast("Cannot open link: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun readClipboard(): String {
            return try {
                val clipManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val item = clipManager.primaryClip?.getItemAt(0)
                item?.text?.toString() ?: ""
            } catch (_: Exception) {
                ""
            }
        }

        @JavascriptInterface
        fun shareUrl(url: String, title: String) {
            runOnUiThread {
                try {
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_SUBJECT, title)
                        putExtra(Intent.EXTRA_TEXT, url)
                    }
                    startActivity(Intent.createChooser(shareIntent, "Share Video"))
                } catch (e: Exception) {
                    toast("Share failed: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun toast(message: String) {
            runOnUiThread { this@MainActivity.toast(message) }
        }

        @JavascriptInterface
        fun setServer(url: String) {
            runOnUiThread {
                val clean = url.trim().replace(Regex("/+$"), "")
                prefs.edit().putString(KEY_SERVER, clean).apply()
            }
        }
    }

    private fun downloadFile(url: String, customTitle: String?, contentDisposition: String?, userAgent: String?) {
        val safeUrl = url.trim()
        if (safeUrl.isEmpty()) return

        val fileName = if (!customTitle.isNullOrBlank()) {
            val extension = if (safeUrl.contains("audio", ignoreCase = true) || safeUrl.endsWith(".mp3")) ".mp3" else ".mp4"
            sanitizeFileName(customTitle) + if (customTitle.endsWith(".mp4", ignoreCase = true) || customTitle.endsWith(".mp3", ignoreCase = true)) "" else extension
        } else {
            resolveFileName(safeUrl, contentDisposition)
        }

        try {
            val dm = getSystemService(DownloadManager::class.java)
            val request = DownloadManager.Request(Uri.parse(safeUrl))
                .setTitle(fileName)
                .setDescription(getString(R.string.downloading_title))
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(true)

            val ua = if (!userAgent.isNullOrBlank()) userAgent else webView.settings.userAgentString
            request.addRequestHeader("User-Agent", ua)
            request.addRequestHeader("Referer", "https://www.youtube.com/")

            dm.enqueue(request)
            toast("Downloading \"$fileName\" to Downloads folder…")
        } catch (e: Exception) {
            toast("Download failed: ${e.message}")
        }
    }

    private fun resolveFileName(url: String, contentDisposition: String?): String {
        contentDisposition?.let { cd ->
            val star = Regex("filename\\*=UTF-8''([^;]+)", RegexOption.IGNORE_CASE)
            star.find(cd)?.let { m ->
                return sanitizeFileName(decode(m.groupValues[1]))
            }
            val plain = Regex("filename=\"?([^\";]+)\"?", RegexOption.IGNORE_CASE)
            plain.find(cd)?.let { m ->
                return sanitizeFileName(decode(m.groupValues[1]))
            }
            URLUtil.guessFileName(url, contentDisposition, null)?.let {
                if (it.isNotBlank() && !it.endsWith(".bin")) return sanitizeFileName(it)
            }
        }
        val default = "video_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        return URLUtil.guessFileName(url, null, null)?.takeIf { it.isNotBlank() && !it.endsWith(".bin") } ?: "$default.mp4"
    }

    private fun sanitizeFileName(name: String): String {
        val cleaned = name.replace(Regex("[<>:\"/\\\\|?*\\x00-\\x1f]"), "").trim()
        return if (cleaned.isBlank()) "video_" + System.currentTimeMillis() else cleaned
    }

    private fun decode(value: String) = try {
        java.net.URLDecoder.decode(value.replace("+", "%2B"), "UTF-8")
    } catch (_: Exception) {
        value
    }

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    override fun onBackPressed() {
        if (customView != null) {
            webView.webChromeClient?.onHideCustomView()
        } else if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        try {
            downloadCompleteReceiver?.let { unregisterReceiver(it) }
        } catch (_: Exception) {}
        webView.destroy()
        super.onDestroy()
    }
}