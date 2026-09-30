using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AgyEnhancer
{
    static class SettingsLauncher
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                string rootDir = baseDir;
                if (Path.GetFileName(rootDir).Equals("scripts", StringComparison.OrdinalIgnoreCase))
                {
                    rootDir = Path.GetDirectoryName(rootDir);
                }

                // 确保守护服务在后台运行
                EnsureDaemonRunning(rootDir);

                string htmlFile = Path.Combine(rootDir, "settings-v2.html");
                if (!File.Exists(htmlFile))
                {
                    htmlFile = Path.Combine(rootDir, "settings.html");
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
