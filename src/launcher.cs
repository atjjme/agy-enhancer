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
                // 1. 若后台守护服务已在运行，直接平稳退出（全局单例保证）
                if (IsDaemonOnline())
                {
                    return;
                }

                // 2. 定位项目根目录与 loader.js
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                string rootDir = baseDir;
                string targetJs = Path.Combine(baseDir, "scripts", "loader.js");

                if (!File.Exists(targetJs))
                {
                    // 若可执行文件直接放在 scripts 目录下运行
                    targetJs = Path.Combine(baseDir, "loader.js");
                    rootDir = Path.GetDirectoryName(baseDir);
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
    }
}
