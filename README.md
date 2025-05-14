using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol;
using ModelContextProtocol.Client;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol.Transport;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace WinFormWebView2
{
	internal static class Program
	{

		private static IWebHost? webHost;
		private static readonly HttpClient httpClient = new HttpClient();

		/// <summary>
		///  The main entry point for the application.
		/// </summary>
		[STAThread]
		static void Main()
		{
			StartWebServer();
			StartMCPServer();
			CreateMCPClient();
			ApplicationConfiguration.Initialize();
			Application.Run(new Form1());
		}

		private static async void CreateMCPClient()
		{

		}

		private static void StartWebServer()
		{
			webHost = new WebHostBuilder()
				.UseKestrel()
				.Configure(app =>
				{
					app.Run(async context =>
					{
						if (context.Request.Path == "/")
						{
							await context.Response.WriteAsync("Hello World");
						}
					});
				})
				.UseUrls("http://localhost:5050")
				.Build();

			Task.Run(() => webHost.Run());
		}

		private static async void StartMCPServer()
		{
			var builder = Host.CreateEmptyApplicationBuilder(settings: null);

			builder.Services.AddMcpServer()
				.WithStdioServerTransport()
				.WithToolsFromAssembly();

			builder.Services.AddSingleton(_ =>
			{
				var client = new HttpClient() { BaseAddress = new Uri("https://api.weather.gov") };
				client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("weather-tool", "1.0"));
				return client;
			});

			var app = builder.Build();

			await app.RunAsync();
		}
	}
}


<PackageReference Include="Microsoft.Extensions.Hosting" Version="9.0.5" />
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.2277.86" />
    <PackageReference Include="ModelContextProtocol" Version="0.1.0-preview.13" />
    <PackageReference Include="Microsoft.AspNetCore.Hosting" Version="2.2.7" />
    <PackageReference Include="Microsoft.AspNetCore.Server.Kestrel" Version="2.2.0" />
