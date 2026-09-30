using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace AgyEnhancer
{
    public class ModernDarkColorTable : ProfessionalColorTable
    {
        // 匹配设置中心：深色底座 #0f172a, 日冕橙 #ea580c, 琥珀金 #f59e0b
        public override Color MenuBorder { get { return Color.FromArgb(234, 88, 12); } }
        public override Color ToolStripDropDownBackground { get { return Color.FromArgb(15, 23, 42); } }
        public override Color ImageMarginGradientBegin { get { return Color.FromArgb(15, 23, 42); } }
        public override Color ImageMarginGradientMiddle { get { return Color.FromArgb(15, 23, 42); } }
        public override Color ImageMarginGradientEnd { get { return Color.FromArgb(15, 23, 42); } }
        public override Color MenuItemSelected { get { return Color.FromArgb(40, 25, 18); } }
        public override Color MenuItemSelectedGradientBegin { get { return Color.FromArgb(40, 25, 18); } }
        public override Color MenuItemSelectedGradientEnd { get { return Color.FromArgb(40, 25, 18); } }
        public override Color MenuItemBorder { get { return Color.FromArgb(245, 158, 11); } }
        public override Color CheckBackground { get { return Color.FromArgb(30, 20, 15); } }
        public override Color CheckSelectedBackground { get { return Color.FromArgb(50, 28, 16); } }
        public override Color CheckPressedBackground { get { return Color.FromArgb(50, 28, 16); } }
        public override Color SeparatorDark { get { return Color.FromArgb(45, 55, 72); } }
        public override Color SeparatorLight { get { return Color.FromArgb(15, 23, 42); } }
    }

    public class ModernDarkMenuRenderer : ToolStripProfessionalRenderer
    {
        public ToolStripMenuItem AutostartMenuItem { get; set; }

        public ModernDarkMenuRenderer() : base(new ModernDarkColorTable())
        {
        }

        protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
        {
            e.TextColor = e.Item.Selected ? Color.FromArgb(251, 191, 36) : Color.FromArgb(241, 245, 249);
            base.OnRenderItemText(e);
        }

        protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
        {
            base.OnRenderMenuItemBackground(e);

            ToolStripMenuItem item = e.Item as ToolStripMenuItem;
            if (item != null && item == AutostartMenuItem && !item.Checked)
            {
                Graphics g = e.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int size = 14;
                int x = 6;
                int y = (item.Height - size) / 2;
                using (Pen pen = new Pen(Color.FromArgb(90, 70, 55), 1.2f))
                {
                    g.DrawRectangle(pen, x, y, size, size);
                }
            }
        }

        protected override void OnRenderItemCheck(ToolStripItemImageRenderEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = e.ImageRectangle;

            int size = 14;
            int x = rect.Left + (rect.Width - size) / 2;
            int y = rect.Top + (rect.Height - size) / 2;
            Rectangle box = new Rectangle(x, y, size, size);

            using (SolidBrush bgBrush = new SolidBrush(Color.FromArgb(55, 234, 88, 12)))
            using (Pen borderPen = new Pen(Color.FromArgb(234, 88, 12), 1.2f))
            {
                g.FillRectangle(bgBrush, box);
                g.DrawRectangle(borderPen, box);
            }

            using (Pen pen = new Pen(Color.FromArgb(251, 191, 36), 2.0f))
            {
                pen.StartCap = LineCap.Round;
                pen.EndCap = LineCap.Round;
                pen.LineJoin = LineJoin.Round;
                Point[] checkPoints = new Point[]
                {
                    new Point(box.Left + 3, box.Top + 7),
                    new Point(box.Left + 6, box.Bottom - 4),
                    new Point(box.Right - 3, box.Top + 4)
                };
                g.DrawLines(pen, checkPoints);
            }
        }

        protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, e.ToolStrip.Width - 1, e.ToolStrip.Height - 1);
            using (Pen pen = new Pen(Color.FromArgb(234, 88, 12), 1.2f))
            {
                using (GraphicsPath path = CreateRoundedRectanglePath(rect, 8))
                {
                    g.DrawPath(pen, path);
                }
            }
        }

        public static GraphicsPath CreateRoundedRectanglePath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            if (diameter > rect.Width) diameter = rect.Width;
            if (diameter > rect.Height) diameter = rect.Height;

            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    public class TrayAppContext : ApplicationContext
    {
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        private const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
        private const int DWMWCP_ROUND = 2; // 圆角

        private NotifyIcon notifyIcon;
        private ContextMenuStrip contextMenu;
        private ToolStripMenuItem itemSettings;
        private ToolStripMenuItem itemAutostart;
        private ToolStripMenuItem itemTheme;
        private ToolStripMenuItem itemThemeSystem;
        private ToolStripMenuItem itemThemeLight;
        private ToolStripMenuItem itemThemeDark;
        private ToolStripMenuItem itemLang;
        private ToolStripMenuItem itemLangAuto;
        private ToolStripMenuItem itemLangZhCn;
        private ToolStripMenuItem itemLangZhTw;
        private ToolStripMenuItem itemLangEn;
        private ToolStripMenuItem itemHideTray;
        private ToolStripMenuItem itemStartService;
        private ToolStripMenuItem itemExit;

        private string rootDir;
        private string scriptsDir;

        public TrayAppContext()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            if (Directory.Exists(Path.Combine(baseDir, "scripts")))
            {
                rootDir = baseDir;
                scriptsDir = Path.Combine(baseDir, "scripts");
            }
            else
            {
                scriptsDir = baseDir;
                rootDir = Path.GetDirectoryName(baseDir);
            }

            InitUI();
        }

        private void InitUI()
        {
            ModernDarkMenuRenderer renderer = new ModernDarkMenuRenderer();

            contextMenu = new ContextMenuStrip();
            contextMenu.Renderer = renderer;
            contextMenu.ShowImageMargin = false;
            contextMenu.ShowCheckMargin = true;
            contextMenu.Font = new Font("Microsoft YaHei UI", 9.5f, FontStyle.Regular);
            contextMenu.Padding = new Padding(2, 6, 4, 6);

            // 1. 设置中心
            itemSettings = new ToolStripMenuItem("设置中心");
            itemSettings.Click += (s, e) => OpenSettings();
            contextMenu.Items.Add(itemSettings);

            // 2. 开机自启
            itemAutostart = new ToolStripMenuItem("开机自启");
            itemAutostart.CheckOnClick = true;
            itemAutostart.Checked = IsAutostartConfigured();
            itemAutostart.Click += (s, e) => ToggleAutostart();
            renderer.AutostartMenuItem = itemAutostart;
            contextMenu.Items.Add(itemAutostart);

            // 3. 界面主题子菜单
            itemTheme = new ToolStripMenuItem("界面主题");
            itemTheme.DropDown.Renderer = renderer;
            ToolStripDropDownMenu themeMenu = itemTheme.DropDown as ToolStripDropDownMenu;
            if (themeMenu != null)
            {
                themeMenu.ShowImageMargin = false;
                themeMenu.ShowCheckMargin = true;
            }
            itemTheme.DropDown.Font = contextMenu.Font;

            itemThemeSystem = new ToolStripMenuItem("跟随系统", null, (s, e) => SetTheme("system"));
            itemThemeLight = new ToolStripMenuItem("浅色模式", null, (s, e) => SetTheme("light"));
            itemThemeDark = new ToolStripMenuItem("深色模式", null, (s, e) => SetTheme("dark"));

            itemTheme.DropDownItems.AddRange(new ToolStripItem[] { itemThemeSystem, itemThemeLight, itemThemeDark });
            contextMenu.Items.Add(itemTheme);

            // 4. 界面语言子菜单
            itemLang = new ToolStripMenuItem("界面语言");
            itemLang.DropDown.Renderer = renderer;
            ToolStripDropDownMenu langMenu = itemLang.DropDown as ToolStripDropDownMenu;
            if (langMenu != null)
            {
                langMenu.ShowImageMargin = false;
                langMenu.ShowCheckMargin = true;
            }
            itemLang.DropDown.Font = contextMenu.Font;

            itemLangAuto = new ToolStripMenuItem("跟随系统", null, (s, e) => SetLang("auto"));
            itemLangZhCn = new ToolStripMenuItem("简体中文", null, (s, e) => SetLang("zh-CN"));
            itemLangZhTw = new ToolStripMenuItem("繁體中文", null, (s, e) => SetLang("zh-TW"));
            itemLangEn = new ToolStripMenuItem("English", null, (s, e) => SetLang("en"));

            itemLang.DropDownItems.AddRange(new ToolStripItem[] { itemLangAuto, itemLangZhCn, itemLangZhTw, itemLangEn });
            contextMenu.Items.Add(itemLang);

            // 分割线
            contextMenu.Items.Add(new ToolStripSeparator());

            // 5. 启动服务
            itemStartService = new ToolStripMenuItem("启动服务");
            itemStartService.Click += (s, e) => StartService();
            contextMenu.Items.Add(itemStartService);

            // 6. 隐藏托盘
            itemHideTray = new ToolStripMenuItem("隐藏托盘");
            itemHideTray.Click += (s, e) => DisableTrayAndExit();
            contextMenu.Items.Add(itemHideTray);

            // 分割线
            contextMenu.Items.Add(new ToolStripSeparator());

            // 7. 退出
            itemExit = new ToolStripMenuItem("退出");
            itemExit.Click += (s, e) => ExitAllServices();
            contextMenu.Items.Add(itemExit);

            // 菜单圆角支持 (Windows 11 原生圆角 + 双重保障)
            ApplyRoundCorners(contextMenu);
            ApplyRoundCorners(itemTheme.DropDown);
            ApplyRoundCorners(itemLang.DropDown);

            UpdateMenuLanguage();
            UpdateThemeMenuCheck();

            // 加载图标 (精准匹配系统托盘当前 DPI 小图标尺寸，杜绝 Windows 强制缩放导致的模糊发虚)
            Icon icon = null;
            string icoPath = Path.Combine(rootDir, "assets", "icon.ico");
            if (File.Exists(icoPath))
            {
                try
                {
                    Size traySize = SystemInformation.SmallIconSize;
                    icon = new Icon(icoPath, traySize);
                }
                catch
                {
                    try
                    {
                        using (FileStream fs = new FileStream(icoPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                        {
                            using (Icon tempIcon = new Icon(fs))
                            {
                                icon = (Icon)tempIcon.Clone();
                            }
                        }
                    }
                    catch {}
                }
            }
            if (icon == null)
            {
                icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }

            notifyIcon = new NotifyIcon();
            notifyIcon.Icon = icon;
            notifyIcon.Text = "agy-enhancer";
            notifyIcon.ContextMenuStrip = contextMenu;
            notifyIcon.Visible = true;

            notifyIcon.DoubleClick += (s, e) => OpenSettings();

            contextMenu.Opening += (s, e) =>
            {
                itemAutostart.Checked = IsAutostartConfigured();
                UpdateMenuLanguage();
                UpdateThemeMenuCheck();
            };
        }

        private void ApplyRoundCorners(ToolStripDropDown menu)
        {
            if (menu == null) return;
            menu.Opened += (s, e) =>
            {
                try
                {
                    int preference = DWMWCP_ROUND;
                    DwmSetWindowAttribute(menu.Handle, DWMWA_WINDOW_CORNER_PREFERENCE, ref preference, sizeof(int));
                }
                catch {}
            };
        }

        private string GetConfigValue(string keyName, string defaultValue)
        {
            try
            {
                string[] possibleConfigs = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "antigravity", "agy-enhancer-config.json"),
                    Path.Combine(scriptsDir, "agy-enhancer-config.json"),
                    Path.Combine(rootDir, "agy-enhancer-config.json")
                };

                foreach (string cf in possibleConfigs)
                {
                    if (File.Exists(cf))
                    {
                        string content = File.ReadAllText(cf);
                        Match m = Regex.Match(content, "\"" + keyName + "\"\\s*:\\s*\"([^\"]+)\"");
                        if (m.Success)
                        {
                            return m.Groups[1].Value.Trim();
                        }
                    }
                }
            }
            catch {}
            return defaultValue;
        }

        private void SaveConfigValue(string keyName, string val)
        {
            try
            {
                // 1. 同步向本地 API 发送 POST
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:37210/api/config");
                    req.Method = "POST";
                    req.ContentType = "application/json";
                    req.Timeout = 800;
                    byte[] bytes = Encoding.UTF8.GetBytes(string.Format("{{\"{0}\":\"{1}\"}}", keyName, val));
                    req.ContentLength = bytes.Length;
                    using (Stream st = req.GetRequestStream())
                    {
                        st.Write(bytes, 0, bytes.Length);
                    }
                    using (WebResponse resp = req.GetResponse()) {}
                }
                catch {}

                // 2. 本地配置文件写入
                string[] possibleConfigs = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "antigravity", "agy-enhancer-config.json"),
                    Path.Combine(scriptsDir, "agy-enhancer-config.json"),
                    Path.Combine(rootDir, "agy-enhancer-config.json")
                };

                foreach (string cf in possibleConfigs)
                {
                    if (File.Exists(cf))
                    {
                        string content = File.ReadAllText(cf);
                        string pattern = "\"" + keyName + "\"\\s*:\\s*\"[^\"]*\"";
                        if (Regex.IsMatch(content, pattern))
                        {
                            content = Regex.Replace(content, pattern, string.Format("\"{0}\": \"{1}\"", keyName, val));
                        }
                        else
                        {
                            int lastBrace = content.LastIndexOf('}');
                            if (lastBrace > 0)
                            {
                                content = content.Substring(0, lastBrace).TrimEnd() + ",\n  \"" + keyName + "\": \"" + val + "\"\n}";
                            }
                        }
                        File.WriteAllText(cf, content);
                    }
                }
            }
            catch {}
        }

        private void SetTheme(string theme)
        {
            SaveConfigValue("UI_THEME_MODE", theme);
            UpdateThemeMenuCheck();
        }

        private void UpdateThemeMenuCheck()
        {
            string theme = GetConfigValue("UI_THEME_MODE", "system").ToLower();
            if (itemThemeSystem != null) itemThemeSystem.Checked = (theme == "system");
            if (itemThemeLight != null) itemThemeLight.Checked = (theme == "light");
            if (itemThemeDark != null) itemThemeDark.Checked = (theme == "dark");
        }

        private void SetLang(string lang)
        {
            SaveConfigValue("UI_LANG", lang);
            UpdateMenuLanguage();
        }

        private string GetEffectiveLanguage()
        {
            string lang = GetConfigValue("UI_LANG", "auto").ToLower();
            if (lang == "en") return "en";
            if (lang == "zh-tw") return "zh-tw";
            if (lang.StartsWith("zh")) return "zh-cn";

            try
            {
                string sysLang = System.Globalization.CultureInfo.CurrentUICulture.Name.ToLower();
                if (sysLang.Contains("tw") || sysLang.Contains("hk")) return "zh-tw";
                if (sysLang.StartsWith("zh")) return "zh-cn";
                return "en";
            }
            catch
            {
                return "zh-cn";
            }
        }

        private void UpdateMenuLanguage()
        {
            try
            {
                string effLang = GetEffectiveLanguage();
                string cfgLang = GetConfigValue("UI_LANG", "auto").ToLower();

                if (itemLangAuto != null) itemLangAuto.Checked = (cfgLang == "auto");
                if (itemLangZhCn != null) itemLangZhCn.Checked = (cfgLang == "zh-cn");
                if (itemLangZhTw != null) itemLangZhTw.Checked = (cfgLang == "zh-tw");
                if (itemLangEn != null) itemLangEn.Checked = (cfgLang == "en");

                if (effLang == "en")
                {
                    if (itemSettings != null) itemSettings.Text = "Settings Center";
                    if (itemAutostart != null) itemAutostart.Text = "Start on Boot";
                    if (itemTheme != null) itemTheme.Text = "Theme";
                    if (itemThemeSystem != null) itemThemeSystem.Text = "Follow System";
                    if (itemThemeLight != null) itemThemeLight.Text = "Light Mode";
                    if (itemThemeDark != null) itemThemeDark.Text = "Dark Mode";
                    if (itemLang != null) itemLang.Text = "Language";
                    if (itemLangAuto != null) itemLangAuto.Text = "Follow System";
                    if (itemHideTray != null) itemHideTray.Text = "Hide System Tray";
                    if (itemStartService != null) itemStartService.Text = "Start Service";
                    if (itemExit != null) itemExit.Text = "Exit";
                }
                else if (effLang == "zh-tw")
                {
                    if (itemSettings != null) itemSettings.Text = "設定中心";
                    if (itemAutostart != null) itemAutostart.Text = "開機自啟";
                    if (itemTheme != null) itemTheme.Text = "介面主題";
                    if (itemThemeSystem != null) itemThemeSystem.Text = "跟隨系統";
                    if (itemThemeLight != null) itemThemeLight.Text = "淺色模式";
                    if (itemThemeDark != null) itemThemeDark.Text = "深色模式";
                    if (itemLang != null) itemLang.Text = "介面語言";
                    if (itemLangAuto != null) itemLangAuto.Text = "跟隨系統";
                    if (itemHideTray != null) itemHideTray.Text = "隱藏托盤";
                    if (itemStartService != null) itemStartService.Text = "啟動服務";
                    if (itemExit != null) itemExit.Text = "退出";
                }
                else
                {
                    if (itemSettings != null) itemSettings.Text = "设置中心";
                    if (itemAutostart != null) itemAutostart.Text = "开机自启";
                    if (itemTheme != null) itemTheme.Text = "界面主题";
                    if (itemThemeSystem != null) itemThemeSystem.Text = "跟随系统";
                    if (itemThemeLight != null) itemThemeLight.Text = "浅色模式";
                    if (itemThemeDark != null) itemThemeDark.Text = "深色模式";
                    if (itemLang != null) itemLang.Text = "界面语言";
                    if (itemLangAuto != null) itemLangAuto.Text = "跟随系统";
                    if (itemHideTray != null) itemHideTray.Text = "隐藏托盘";
                    if (itemStartService != null) itemStartService.Text = "启动服务";
                    if (itemExit != null) itemExit.Text = "退出";
                }
            }
            catch {}
        }

        private void OpenSettings()
        {
            try
            {
                string settingsExe = Path.Combine(rootDir, "settings.exe");
                if (File.Exists(settingsExe))
                {
                    Process.Start(new ProcessStartInfo(settingsExe) { UseShellExecute = true });
                    return;
                }

                string settingsV2Exe = Path.Combine(rootDir, "settings-v2.exe");
                if (File.Exists(settingsV2Exe))
                {
                    Process.Start(new ProcessStartInfo(settingsV2Exe) { UseShellExecute = true });
                    return;
                }

                string settingsHtml = Path.Combine(rootDir, "settings-v2.html");
                if (File.Exists(settingsHtml))
                {
                    Process.Start(new ProcessStartInfo(settingsHtml) { UseShellExecute = true });
                    return;
                }

                // 兜底原版
                Process.Start(new ProcessStartInfo(Path.Combine(rootDir, "settings.html")) { UseShellExecute = true });
            }
            catch {}
        }

        private bool IsAutostartConfigured()
        {
            try
            {
                string startupFolder = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                string lnkPath = Path.Combine(startupFolder, "agy-enhancer-silent.lnk");
                return File.Exists(lnkPath);
            }
            catch
            {
                return false;
            }
        }

        private void ToggleAutostart()
        {
            try
            {
                bool targetState = !IsAutostartConfigured();
                string batFile = targetState ? "setup-autostart.bat" : "remove-autostart.bat";
                string fullBat = Path.Combine(scriptsDir, batFile);

                if (File.Exists(fullBat))
                {
                    RunBatHidden(fullBat);
                }

                Thread.Sleep(300);
                itemAutostart.Checked = IsAutostartConfigured();
            }
            catch {}
        }

        private void StartService()
        {
            try
            {
                string launcherExe = Path.Combine(rootDir, "agy-enhancer.exe");
                if (File.Exists(launcherExe))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = launcherExe;
                    psi.WorkingDirectory = rootDir;
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                    Process.Start(psi);
                    return;
                }

                string vbs = Path.Combine(scriptsDir, "agy-enhancer.vbs");
                if (File.Exists(vbs))
                {
                    Process.Start(new ProcessStartInfo("wscript.exe", "\"" + vbs + "\"") { UseShellExecute = false, CreateNoWindow = true });
                }
            }
            catch {}
        }

        private void DisableTrayAndExit()
        {
            try
            {
                SaveConfigValue("ENABLE_SYSTEM_TRAY", "false");
            }
            catch {}

            ExitTrayOnly();
        }

        private void ExitTrayOnly()
        {
            if (notifyIcon != null)
            {
                notifyIcon.Visible = false;
                notifyIcon.Dispose();
            }
            Application.Exit();
        }

        private void ExitAllServices()
        {
            try
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:37210/api/shutdown");
                    req.Timeout = 600;
                    req.Method = "GET";
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse()) {}
                }
                catch {}

                string stopBat = Path.Combine(scriptsDir, "stop-service.bat");
                if (File.Exists(stopBat))
                {
                    RunBatHidden(stopBat, "--nopause");
                }
            }
            catch {}

            ExitTrayOnly();
        }

        private void RunBatHidden(string batPath, string args = "")
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c \"" + batPath + "\" " + args;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process.Start(psi);
            }
            catch {}
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            bool createdNew = false;
            Mutex mutex = null;
            try
            {
                mutex = new Mutex(true, @"Local\AntigravityEnhancer_SystemTray_Singleton", out createdNew);
            }
            catch {}

            if (!createdNew)
            {
                int currentPid = Process.GetCurrentProcess().Id;
                Process[] procs = Process.GetProcessesByName("agy-tray");
                bool anotherRunning = false;
                foreach (Process p in procs)
                {
                    if (p.Id != currentPid)
                    {
                        anotherRunning = true;
                        break;
                    }
                }

                if (anotherRunning)
                {
                    return;
                }
            }

            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new TrayAppContext());
            }
            catch {}
            finally
            {
                if (mutex != null)
                {
                    try { mutex.ReleaseMutex(); } catch {}
                    mutex.Close();
                }
            }
        }
    }
}
