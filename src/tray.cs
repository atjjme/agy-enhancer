using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace AgyEnhancer
{
    public class ModernDarkColorTable : ProfessionalColorTable
    {
        public override Color MenuBorder { get { return Color.FromArgb(61, 35, 17); } }
        public override Color ToolStripDropDownBackground { get { return Color.FromArgb(20, 12, 6); } }
        public override Color ImageMarginGradientBegin { get { return Color.FromArgb(20, 12, 6); } }
        public override Color ImageMarginGradientMiddle { get { return Color.FromArgb(20, 12, 6); } }
        public override Color ImageMarginGradientEnd { get { return Color.FromArgb(20, 12, 6); } }
        public override Color MenuItemSelected { get { return Color.FromArgb(45, 26, 13); } }
        public override Color MenuItemSelectedGradientBegin { get { return Color.FromArgb(45, 26, 13); } }
        public override Color MenuItemSelectedGradientEnd { get { return Color.FromArgb(45, 26, 13); } }
        public override Color MenuItemBorder { get { return Color.FromArgb(84, 49, 24); } }
        public override Color CheckBackground { get { return Color.FromArgb(32, 20, 10); } }
        public override Color CheckSelectedBackground { get { return Color.FromArgb(50, 30, 15); } }
        public override Color CheckPressedBackground { get { return Color.FromArgb(50, 30, 15); } }
        public override Color SeparatorDark { get { return Color.FromArgb(61, 35, 17); } }
        public override Color SeparatorLight { get { return Color.FromArgb(20, 12, 6); } }
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

            // 当开机自启未勾选时，在左侧复选区域渲染半透明空方框，让状态一目了然
            ToolStripMenuItem item = e.Item as ToolStripMenuItem;
            if (item != null && item == AutostartMenuItem && !item.Checked)
            {
                Graphics g = e.Graphics;
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
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
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            Rectangle rect = e.ImageRectangle;

            int size = 14;
            int x = rect.Left + (rect.Width - size) / 2;
            int y = rect.Top + (rect.Height - size) / 2;
            Rectangle box = new Rectangle(x, y, size, size);

            // 绘制日冕暖橙微光背景方框
            using (SolidBrush bgBrush = new SolidBrush(Color.FromArgb(55, 249, 115, 22)))
            using (Pen borderPen = new Pen(Color.FromArgb(249, 115, 22), 1.2f))
            {
                g.FillRectangle(bgBrush, box);
                g.DrawRectangle(borderPen, box);
            }

            // 绘制日冕金黄对号
            using (Pen pen = new Pen(Color.FromArgb(251, 191, 36), 2.0f))
            {
                pen.StartCap = System.Drawing.Drawing2D.LineCap.Round;
                pen.EndCap = System.Drawing.Drawing2D.LineCap.Round;
                pen.LineJoin = System.Drawing.Drawing2D.LineJoin.Round;
                Point[] checkPoints = new Point[]
                {
                    new Point(box.Left + 3, box.Top + 7),
                    new Point(box.Left + 6, box.Bottom - 4),
                    new Point(box.Right - 3, box.Top + 4)
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
            ModernDarkMenuRenderer renderer = new ModernDarkMenuRenderer();

            contextMenu = new ContextMenuStrip();
            contextMenu.Renderer = renderer;
            contextMenu.ShowImageMargin = false;
            contextMenu.ShowCheckMargin = true;
            contextMenu.Font = new Font("Microsoft YaHei UI", 9.5f, FontStyle.Regular);
            contextMenu.Padding = new Padding(2, 6, 4, 6);

            // 1. 设置中心
            ToolStripMenuItem itemSettings = new ToolStripMenuItem("设置中心");
            itemSettings.Click += (s, e) => OpenSettings();
            contextMenu.Items.Add(itemSettings);

            // 2. 开机自启
            itemAutostart = new ToolStripMenuItem("开机自启");
            itemAutostart.CheckOnClick = true;
            itemAutostart.Checked = IsAutostartConfigured();
            itemAutostart.Click += (s, e) => ToggleAutostart();
            renderer.AutostartMenuItem = itemAutostart;
            contextMenu.Items.Add(itemAutostart);

            // 3. 隐藏托盘
            ToolStripMenuItem itemHideTray = new ToolStripMenuItem("隐藏托盘");
            itemHideTray.Click += (s, e) => DisableTrayAndExit();
            contextMenu.Items.Add(itemHideTray);

            // 分割线
            contextMenu.Items.Add(new ToolStripSeparator());

            // 4. 退出
            ToolStripMenuItem itemExit = new ToolStripMenuItem("退出");
            itemExit.Click += (s, e) => ExitAllServices();
            contextMenu.Items.Add(itemExit);

            // 无锁加载图标 (使用 FileShare.ReadWrite 与 Clone 解除文件锁定并避免 stream 提前释放)
            Icon icon = null;
            string icoPath = Path.Combine(rootDir, "assets", "icon.ico");
            if (File.Exists(icoPath))
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
            if (icon == null)
            {
                icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }

            notifyIcon = new NotifyIcon();
            notifyIcon.Icon = icon;
            notifyIcon.Text = "agy-enhancer";
            notifyIcon.ContextMenuStrip = contextMenu;
            notifyIcon.Visible = true;
            Log("NotifyIcon created with text 'agy-enhancer' and set to Visible=true");

            // 左键单击或双击均打开设置
            notifyIcon.Click += (s, e) =>
            {
                MouseEventArgs me = e as MouseEventArgs;
                if (me != null && me.Button == MouseButtons.Left)
                {
                    OpenSettings();
                }
            };
            notifyIcon.DoubleClick += (s, e) => OpenSettings();

            // 每次右键展开菜单时，实时查询真实自启状态
            contextMenu.Opening += (s, e) =>
            {
                itemAutostart.Checked = IsAutostartConfigured();
            };
        }

        private void OpenSettings()
        {
            try
            {
                // 优先访问本地守护进程设置微服务，以保证同源与多主题联动
                bool serverOnline = false;
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:37210/api/config");
                    req.Timeout = 600;
                    req.Method = "GET";
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    {
                        if (resp.StatusCode == HttpStatusCode.OK)
                        {
                            serverOnline = true;
                        }
                    }
                }
                catch {}

                if (serverOnline)
                {
                    Process.Start(new ProcessStartInfo("http://127.0.0.1:37210/") { UseShellExecute = true });
                    return;
                }

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
                // 1. 同步向守护服务提交禁用系统托盘 API
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:37210/api/config");
                    req.Method = "POST";
                    req.ContentType = "application/json";
                    req.Timeout = 800;
                    byte[] postBytes = Encoding.UTF8.GetBytes("{\"ENABLE_SYSTEM_TRAY\":false}");
                    req.ContentLength = postBytes.Length;
                    using (Stream stream = req.GetRequestStream())
                    {
                        stream.Write(postBytes, 0, postBytes.Length);
                    }
                    using (WebResponse resp = req.GetResponse()) {}
                }
                catch {}

                // 2. 修改真实持久化配置文件的 ENABLE_SYSTEM_TRAY 为 false
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

        public static void Log(string msg)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                string logFile = Path.Combine(baseDir, "agy-tray.log");
                File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss.fff}] {1}\r\n", DateTime.Now, msg));
            }
            catch {}
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            TrayAppContext.Log("Main started. ProcessId=" + Process.GetCurrentProcess().Id);

            Application.ThreadException += (s, e) =>
            {
                TrayAppContext.Log("Application.ThreadException: " + e.Exception.ToString());
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                TrayAppContext.Log("UnhandledException: " + (e.ExceptionObject != null ? e.ExceptionObject.ToString() : "null"));
            };

            bool createdNew = false;
            Mutex mutex = null;
            try
            {
                mutex = new Mutex(true, @"Local\AntigravityEnhancer_SystemTray_Singleton", out createdNew);
            }
            catch (Exception ex)
            {
                TrayAppContext.Log("Mutex creation warning: " + ex.Message);
            }

            if (!createdNew)
            {
                // 二次核实是否真有其它运行中的 agy-tray 进程
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
                    TrayAppContext.Log("Another instance of agy-tray is already running. Exiting cleanly.");
                    return;
                }
                TrayAppContext.Log("Mutex was already held but no other active agy-tray process found. Continuing startup.");
            }

            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                TrayAppContext.Log("Starting Application.Run...");
                Application.Run(new TrayAppContext());
                TrayAppContext.Log("Application.Run ended.");
            }
            catch (Exception ex)
            {
                TrayAppContext.Log("Fatal error in Application.Run: " + ex.ToString());
            }
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
