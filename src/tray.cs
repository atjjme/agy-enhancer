using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace AgyEnhancer
{
    public class ModernDarkColorTable : ProfessionalColorTable
    {
        public override Color MenuBorder { get { return Color.FromArgb(37, 42, 61); } }
        public override Color ToolStripDropDownBackground { get { return Color.FromArgb(19, 22, 32); } }
        public override Color ImageMarginGradientBegin { get { return Color.FromArgb(19, 22, 32); } }
        public override Color ImageMarginGradientMiddle { get { return Color.FromArgb(19, 22, 32); } }
        public override Color ImageMarginGradientEnd { get { return Color.FromArgb(19, 22, 32); } }
        public override Color MenuItemSelected { get { return Color.FromArgb(32, 38, 56); } }
        public override Color MenuItemSelectedGradientBegin { get { return Color.FromArgb(32, 38, 56); } }
        public override Color MenuItemSelectedGradientEnd { get { return Color.FromArgb(32, 38, 56); } }
        public override Color MenuItemBorder { get { return Color.FromArgb(45, 54, 80); } }
        public override Color CheckBackground { get { return Color.FromArgb(24, 30, 44); } }
        public override Color CheckSelectedBackground { get { return Color.FromArgb(32, 38, 56); } }
        public override Color CheckPressedBackground { get { return Color.FromArgb(32, 38, 56); } }
        public override Color SeparatorDark { get { return Color.FromArgb(35, 40, 58); } }
        public override Color SeparatorLight { get { return Color.FromArgb(19, 22, 32); } }
    }

    public class ModernDarkMenuRenderer : ToolStripProfessionalRenderer
    {
        public ModernDarkMenuRenderer() : base(new ModernDarkColorTable())
        {
        }

        protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
        {
            e.TextColor = e.Item.Selected ? Color.FromArgb(56, 189, 248) : Color.FromArgb(241, 245, 249);
            base.OnRenderItemText(e);
        }

        protected override void OnRenderItemCheck(ToolStripItemImageRenderEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            Rectangle rect = e.ImageRectangle;
            using (Pen pen = new Pen(Color.FromArgb(34, 211, 238), 2f))
            {
                Point[] checkPoints = new Point[]
                {
                    new Point(rect.Left + 3, rect.Top + rect.Height / 2),
                    new Point(rect.Left + rect.Width / 2 - 1, rect.Bottom - 4),
                    new Point(rect.Right - 2, rect.Top + 4)
                };
                g.DrawLines(pen, checkPoints);
            }
        }
    }

    public class TrayAppContext : ApplicationContext
    {
        private NotifyIcon notifyIcon;
        private ContextMenuStrip contextMenu;
        private ToolStripMenuItem itemAutostart;
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
            contextMenu = new ContextMenuStrip();
            contextMenu.Renderer = new ModernDarkMenuRenderer();
            contextMenu.ShowImageMargin = false;
            contextMenu.Font = new Font("Microsoft YaHei UI", 9.5f, FontStyle.Regular);
            contextMenu.Padding = new Padding(4, 6, 4, 6);

            // 1. 设置中心 (网页)
            ToolStripMenuItem itemSettings = new ToolStripMenuItem("⚙️  设置中心 (网页)");
            itemSettings.Click += (s, e) => OpenSettings();
            contextMenu.Items.Add(itemSettings);

            // 2. 开机静默自启
            itemAutostart = new ToolStripMenuItem("🚀  开机静默自启");
            itemAutostart.CheckOnClick = true;
            itemAutostart.Checked = IsAutostartConfigured();
            itemAutostart.Click += (s, e) => ToggleAutostart();
            contextMenu.Items.Add(itemAutostart);

            // 3. 隐藏托盘图标
            ToolStripMenuItem itemHideTray = new ToolStripMenuItem("👁️  隐藏托盘图标");
            itemHideTray.Click += (s, e) => DisableTrayAndExit();
            contextMenu.Items.Add(itemHideTray);

            // 分割线
            contextMenu.Items.Add(new ToolStripSeparator());

            // 4. 退出后台服务
            ToolStripMenuItem itemExit = new ToolStripMenuItem("❌  退出后台服务");
            itemExit.Click += (s, e) => ExitAllServices();
            contextMenu.Items.Add(itemExit);

            // 加载图标
            Icon icon = null;
            string icoPath = Path.Combine(rootDir, "assets", "icon.ico");
            if (File.Exists(icoPath))
            {
                try { icon = new Icon(icoPath); } catch {}
            }
            if (icon == null)
            {
                icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }

            notifyIcon = new NotifyIcon();
            notifyIcon.Icon = icon;
            notifyIcon.Text = "Antigravity 增强器 (守护中)";
            notifyIcon.ContextMenuStrip = contextMenu;
            notifyIcon.Visible = true;

            // 左键单击或双击打开设置
            notifyIcon.Click += (s, e) =>
            {
                MouseEventArgs me = e as MouseEventArgs;
                if (me != null && me.Button == MouseButtons.Left)
                {
                    OpenSettings();
                }
            };
            notifyIcon.DoubleClick += (s, e) => OpenSettings();

            // 每次弹出右键菜单时，动态刷新开机自启的真实状态
            contextMenu.Opening += (s, e) =>
            {
                itemAutostart.Checked = IsAutostartConfigured();
            };
        }

        private void OpenSettings()
        {
            try
            {
                string settingsHtml = Path.Combine(rootDir, "settings.html");
                if (File.Exists(settingsHtml))
                {
                    Process.Start(new ProcessStartInfo(settingsHtml) { UseShellExecute = true });
                }
            }
            catch {}
        }

        private bool IsAutostartConfigured()
        {
            try
            {
                string startupDir = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                string lnk = Path.Combine(startupDir, "AntigravityEnhancer.lnk");
                return File.Exists(lnk);
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
                bool currentState = IsAutostartConfigured();
                if (currentState)
                {
                    string bat = Path.Combine(scriptsDir, "remove-autostart.bat");
                    RunBatHidden(bat);
                }
                else
                {
                    string bat = Path.Combine(scriptsDir, "setup-autostart.bat");
                    RunBatHidden(bat, "--nopause");
                }
                itemAutostart.Checked = !currentState;
            }
            catch {}
        }

        private void DisableTrayAndExit()
        {
            try
            {
                // 将本地配置文件的 ENABLE_SYSTEM_TRAY 写入 false
                string[] possibleConfigs = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".antigravity", "agy-enhancer-config.json"),
                    Path.Combine(rootDir, "agy-enhancer-config.json")
                };

                foreach (string cf in possibleConfigs)
                {
                    if (File.Exists(cf))
                    {
                        string content = File.ReadAllText(cf);
                        content = content.Replace("\"ENABLE_SYSTEM_TRAY\": true", "\"ENABLE_SYSTEM_TRAY\": false")
                                         .Replace("\"ENABLE_SYSTEM_TRAY\":true", "\"ENABLE_SYSTEM_TRAY\": false");
                        File.WriteAllText(cf, content);
                    }
                }
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
                string stopBat = Path.Combine(scriptsDir, "stop-service.bat");
                if (File.Exists(stopBat))
                {
                    RunBatHidden(stopBat);
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
            bool createdNew;
            using (Mutex mutex = new Mutex(true, "AntigravityEnhancer_SystemTray_Singleton", out createdNew))
            {
                if (!createdNew)
                {
                    return; // 保证全局单例运行，绝不重复启动多个托盘
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new TrayAppContext());
            }
        }
    }
}
