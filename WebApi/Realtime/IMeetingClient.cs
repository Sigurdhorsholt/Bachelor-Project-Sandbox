using System.Threading.Tasks;

namespace WebApi.Realtime
{
    // Client methods that the server can invoke
    public interface IMeetingClient
    {
        Task ShowConnectedIndicator(bool show);
    }
}

