using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;

namespace AgyEnhancer
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                // 1. 定位项目根目录
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                string rootDir = baseDir;
                if (Path.GetFileName(rootDir).Equals("scripts", StringComparison.OrdinalIgnoreCase))
                {
                    rootDir = Path.GetDirectoryName(rootDir);
                }

                // 2. 若后台守护服务已在运行，唤起设置中心后平稳退出（全局单例保护与快捷设置入口）
                if (IsDaemonOnline())
                {
                    OpenSettings(rootDir);
                    return;
                }

                // 3. 定位 loader.js
                string targetJs = Path.Combine(rootDir, "scripts", "loader.js");
                if (!File.Exists(targetJs))
                {
                    targetJs = Path.Combine(baseDir, "loader.js");
                }

                if (!File.Exists(targetJs))
                {
                    return;
                }

                // 3. 智能发现可用 node.exe
                string nodeExe = FindNodeExecutable();

                // 4. 原生无黑框静默启动 Node 核心守护
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = "\"" + targetJs + "\"";
                psi.WorkingDirectory = rootDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                Process.Start(psi);
            }
            catch
            {
                // 静默容灾
            }
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

        private static string FindNodeExecutable()
        {
            // 候选常见安装路径
            string[] candidates = new string[]
            {
                @"D:\Program Files\nodejs\node.exe",
                @"C:\Program Files\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"nodejs\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"nvm\current\node.exe")
            };

            foreach (string p in candidates)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p))
                {
                    return p;
                }
            }

            // 默认回退到系统环境变量中的 node
            return "node.exe";
        }

        private static void OpenSettings(string rootDir)
        {
            try
            {
                // 优先调起专属设置程序 settings.exe
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

                string settingsV2Html = Path.Combine(rootDir, "settings-v2.html");
                if (File.Exists(settingsV2Html))
                {
                    Process.Start(new ProcessStartInfo(settingsV2Html) { UseShellExecute = true });
                    return;
                }

                string settingsHtml = Path.Combine(rootDir, "settings.html");
                if (File.Exists(settingsHtml))
                {
                    Process.Start(new ProcessStartInfo(settingsHtml) { UseShellExecute = true });
                    return;
                }
            }
            catch {}
        }
    }
}
