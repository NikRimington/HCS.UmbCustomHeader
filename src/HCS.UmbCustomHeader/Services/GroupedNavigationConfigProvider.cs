using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HCS.UmbCustomHeader.Configuration;
using HCS.UmbCustomHeader.Models;

namespace HCS.UmbCustomHeader.Services;

public interface IGroupedNavigationConfigProvider
{
    GroupedNavigationConfigResponse GetConfig();
}

public class GroupedNavigationConfigProvider(
    IOptionsMonitor<GroupedNavigationOptions> options,
    ILogger<GroupedNavigationConfigProvider> logger) : IGroupedNavigationConfigProvider
{
    public GroupedNavigationConfigResponse GetConfig()
    {
        GroupedNavigationOptions current;
        try
        {
            // IOptionsMonitor runs registered IValidateOptions and throws when invalid.
            current = options.CurrentValue;
        }
        catch (OptionsValidationException ex)
        {
            logger.LogError("Invalid GroupedNavigation configuration; falling back to native navigation. {Failures}",
                string.Join(" ", ex.Failures));
            return new GroupedNavigationConfigResponse { Enabled = false };
        }

        if (!current.Enabled)
        {
            return new GroupedNavigationConfigResponse { Enabled = false };
        }

        return new GroupedNavigationConfigResponse
        {
            Enabled = true,
            Groups = current.Groups
                .Select(g => new GroupedNavigationGroupResponse
                {
                    Alias = g.Alias,
                    Label = g.Label,
                    Icon = g.Icon,
                    Weight = g.Weight,
                    Sections = g.Sections.Where(s => !string.IsNullOrWhiteSpace(s)).ToList(),
                })
                .ToList(),
        };
    }
}
