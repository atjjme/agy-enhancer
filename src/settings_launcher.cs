using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AgyEnhancer
{
    static class SettingsLauncher
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetWindowTextLength(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool BringWindowToTop(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        private static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

        [DllImport("kernel32.dll")]
        private static extern uint GetCurrentThreadId();

        private const int SW_RESTORE = 9;
        private const int SW_SHOW = 5;

        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                // 1. 如果已有设置窗口，直接置顶激活并退出
                IntPtr existingWnd = FindExistingSettingsWindow();
                if (existingWnd != IntPtr.Zero)
                {
                    BringToFront(existingWnd);
                    return;
                }

                // 2. 互斥锁防止用户连续狂点时并发打开多个窗口
                bool createdNew = false;
                using (Mutex mutex = new Mutex(true, "Local\\AgyEnhancerSettingsLauncherMutex", out createdNew))
                {
                    if (!createdNew)
                    {
                        // 另一个实例刚在启动中，轮询等待窗口渲染完成并将其拉至前台
                        for (int i = 0; i < 20; i++)
                        {
                            Thread.Sleep(100);
                            IntPtr wnd = FindExistingSettingsWindow();
                            if (wnd != IntPtr.Zero)
                            {
                                BringToFront(wnd);
                                return;
                            }
                        }
                        return;
                    }

                    // 获得锁后二次确认
                    IntPtr wnd2 = FindExistingSettingsWindow();
                    if (wnd2 != IntPtr.Zero)
                    {
                        BringToFront(wnd2);
                        return;
                    }

                    string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                    string rootDir = baseDir;
                    if (Path.GetFileName(rootDir).Equals("scripts", StringComparison.OrdinalIgnoreCase))
                    {
                        rootDir = Path.GetDirectoryName(rootDir);
                    }

                    // 确保守护服务在后台运行
                    EnsureDaemonRunning(rootDir);

                    string htmlFile = Path.Combine(rootDir, "settings.html");
                    if (!File.Exists(htmlFile))
                    {
                        htmlFile = Path.Combine(rootDir, "settings-v2.html");
                    }

                    if (!File.Exists(htmlFile))
                    {
                        return;
                    }

                    string url = new Uri(htmlFile).AbsoluteUri;
                    string browserExe = FindChromiumBrowser();

                    if (!string.IsNullOrEmpty(browserExe) && File.Exists(browserExe))
                    {
                        string profileDir = Path.Combine(Path.GetTempPath(), "agy_enhancer_app_profile");

                        // 精准居中计算
                        int screenWidth = 1920;
                        int screenHeight = 1080;
                        try
                        {
                            screenWidth = Screen.PrimaryScreen.WorkingArea.Width;
                            screenHeight = Screen.PrimaryScreen.WorkingArea.Height;
                        }
                        catch {}

                        int winWidth = 1450;
                        int winHeight = 930;
                        int posX = Math.Max(0, (screenWidth - winWidth) / 2);
                        int posY = Math.Max(0, (screenHeight - winHeight) / 2);

                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = browserExe;
                        // 指定宽 1450, 高 930，居中位置 posX, posY，使用专属独立 profile
                        psi.Arguments = string.Format(
                            "--app=\"{0}\" --window-size={1},{2} --window-position={3},{4} --user-data-dir=\"{5}\" --no-first-run --no-default-browser-check",
                            url, winWidth, winHeight, posX, posY, profileDir
                        );
                        psi.UseShellExecute = false;
                        Process.Start(psi);
                        return;
                    }

                    Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                }
            }
            catch {}
        }

        private static IntPtr FindExistingSettingsWindow()
        {
            IntPtr found = IntPtr.Zero;

            EnumWindows((hWnd, lParam) =>
            {
                if (!IsWindowVisible(hWnd)) return true;

                int length = GetWindowTextLength(hWnd);
                if (length == 0) return true;

                StringBuilder sb = new StringBuilder(length + 1);
                GetWindowText(hWnd, sb, sb.Capacity);
                string title = sb.ToString();

                // 排除 Antigravity IDE 自身窗口
                if (title.IndexOf("Google Antigravity", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }

                bool matchTitle = (title.IndexOf("Antigravity Enhancer - 设置中心", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                   title.IndexOf("Antigravity Enhancer - 設定中心", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                   title.IndexOf("Antigravity Enhancer - Settings", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                   (title.IndexOf("Antigravity Enhancer", StringComparison.OrdinalIgnoreCase) >= 0 && title.IndexOf("设置", StringComparison.OrdinalIgnoreCase) >= 0) ||
                                   (title.IndexOf("agy-enhancer", StringComparison.OrdinalIgnoreCase) >= 0 && title.IndexOf("Antigravity -", StringComparison.OrdinalIgnoreCase) < 0));

                if (matchTitle)
                {
                    try
                    {
                        uint pid;
                        GetWindowThreadProcessId(hWnd, out pid);
                        if (pid != 0)
                        {
                            Process proc = Process.GetProcessById((int)pid);
                            string procName = proc.ProcessName.ToLower();
                            if (procName.Contains("chrome") || procName.Contains("edge") ||
                                procName.Contains("brave") || procName.Contains("settings"))
                            {
                                found = hWnd;
                                return false; // 找到目标，终止枚举
                            }
                        }
                    }
                    catch {}
                }

                return true;
            }, IntPtr.Zero);

            return found;
        }

        private static void BringToFront(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return;

            try
            {
                if (IsIconic(hWnd))
                {
                    ShowWindowAsync(hWnd, SW_RESTORE);
                }
                else
                {
                    ShowWindowAsync(hWnd, SW_SHOW);
                }

                IntPtr foreWnd = GetForegroundWindow();
                uint dummy;
                uint foreThread = 0;
                if (foreWnd != IntPtr.Zero)
                {
                    foreThread = GetWindowThreadProcessId(foreWnd, out dummy);
                }
                uint appThread = GetCurrentThreadId();
                uint targetThread = GetWindowThreadProcessId(hWnd, out dummy);

                bool attachedFore = false;
                bool attachedTarget = false;

                if (foreThread != 0 && foreThread != appThread)
                {
                    attachedFore = AttachThreadInput(foreThread, appThread, true);
                }
                if (targetThread != 0 && targetThread != appThread)
                {
                    attachedTarget = AttachThreadInput(appThread, targetThread, true);
                }

                BringWindowToTop(hWnd);
                SetForegroundWindow(hWnd);

                if (attachedFore)
                {
                    AttachThreadInput(foreThread, appThread, false);
                }
                if (attachedTarget)
                {
                    AttachThreadInput(appThread, targetThread, false);
                }
            }
            catch {}
        }

        private static string FindChromiumBrowser()
        {
            string[] commonPaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe")
            };

            foreach (string p in commonPaths)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }

            try
            {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Clients\StartMenuInternet"))
                {
                    if (key != null)
                    {
                        foreach (string sub in key.GetSubKeyNames())
                        {
                            if (sub.IndexOf("Chrome", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                sub.IndexOf("Edge", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                sub.IndexOf("Brave", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                using (RegistryKey cmdKey = key.OpenSubKey(sub + @"\shell\open\command"))
                                {
                                    if (cmdKey != null)
                                    {
                                        string raw = cmdKey.GetValue("") as string;
                                        if (!string.IsNullOrEmpty(raw))
                                        {
                                            string clean = raw.Trim('"', ' ');
                                            if (File.Exists(clean)) return clean;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch {}

            return null;
        }

        private static bool IsDaemonOnline()
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult ar = client.BeginConnect("127.0.0.1", 37210, null, null);
                    bool success = ar.AsyncWaitHandle.WaitOne(120);
                    if (success && client.Connected)
                    {
                        client.EndConnect(ar);
                        return true;
                    }
                }
            }
            catch {}
            return false;
        }

        private static void EnsureDaemonRunning(string rootDir)
        {
            try
            {
                if (IsDaemonOnline()) return;

                string enhancerExe = Path.Combine(rootDir, "agy-enhancer.exe");
                if (File.Exists(enhancerExe))
                {
                    ProcessStartInfo psi = new ProcessStartInfo(enhancerExe);
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    Process.Start(psi);
                    System.Threading.Thread.Sleep(200);
                }
            }
            catch {}
        }
    }
}
