using Microsoft.Extensions.Options;

namespace HCS.UmbCustomHeader.Configuration;

public class GroupedNavigationOptionsValidator : IValidateOptions<GroupedNavigationOptions>
{
    public ValidateOptionsResult Validate(string? name, GroupedNavigationOptions options)
    {
        var failures = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < options.Groups.Count; i++)
        {
            var group = options.Groups[i];
            var id = $"Groups[{i}]";

            if (string.IsNullOrWhiteSpace(group.Alias))
            {
                failures.Add($"{id}: Alias is required.");
            }
            else if (!seen.Add(group.Alias))
            {
                failures.Add($"{id}: Alias '{group.Alias}' is not unique.");
            }

            if (string.IsNullOrWhiteSpace(group.Label))
            {
                failures.Add($"{id}: Label is required.");
            }

            if (group.Sections.Count == 0 || group.Sections.All(string.IsNullOrWhiteSpace))
            {
                failures.Add($"{id}: Sections must contain at least one section alias.");
            }
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }
}
