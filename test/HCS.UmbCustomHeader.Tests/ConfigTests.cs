using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using HCS.UmbCustomHeader.Configuration;
using HCS.UmbCustomHeader.Services;

namespace HCS.UmbCustomHeader.Tests;

public class ConfigTests
{
    private static GroupOptions Group(string alias = "a", string label = "A", params string[] sections) =>
        new() { Alias = alias, Label = label, Sections = sections.Length == 0 ? ["Umb.Section.Users"] : [.. sections] };

    private static ValidateOptionsResult Validate(params GroupOptions[] groups) =>
        new GroupedNavigationOptionsValidator().Validate(null, new GroupedNavigationOptions { Groups = [.. groups] });

    [Fact]
    public void Valid_config_passes() => Assert.True(Validate(Group("a"), Group("b")).Succeeded);

    [Fact]
    public void Empty_groups_passes() => Assert.True(Validate().Succeeded);

    [Fact]
    public void Duplicate_alias_fails() => Assert.True(Validate(Group("a"), Group("A")).Failed);

    [Fact]
    public void Missing_alias_fails() => Assert.True(Validate(Group("")).Failed);

    [Fact]
    public void Missing_label_fails() => Assert.True(Validate(Group("a", "")).Failed);

    [Fact]
    public void Empty_sections_fails() =>
        Assert.True(Validate(new GroupOptions { Alias = "a", Label = "A" }).Failed);

    [Fact]
    public void Blank_sections_fails() =>
        Assert.True(Validate(new GroupOptions { Alias = "a", Label = "A", Sections = [" "] }).Failed);

    private sealed class Monitor(Func<GroupedNavigationOptions> get) : IOptionsMonitor<GroupedNavigationOptions>
    {
        public GroupedNavigationOptions CurrentValue => get();
        public GroupedNavigationOptions Get(string? name) => get();
        public IDisposable? OnChange(Action<GroupedNavigationOptions, string?> listener) => null;
    }

    [Fact]
    public void Provider_returns_enabled_with_groups()
    {
        var provider = new GroupedNavigationConfigProvider(
            new Monitor(() => new GroupedNavigationOptions { Groups = [Group("a", "A", "x", "y")] }),
            NullLogger<GroupedNavigationConfigProvider>.Instance);

        var result = provider.GetConfig();

        Assert.True(result.Enabled);
        Assert.Equal(["x", "y"], result.Groups.Single().Sections);
    }

    [Fact]
    public void Provider_returns_disabled_when_disabled()
    {
        var provider = new GroupedNavigationConfigProvider(
            new Monitor(() => new GroupedNavigationOptions { Enabled = false, Groups = [Group()] }),
            NullLogger<GroupedNavigationConfigProvider>.Instance);

        var result = provider.GetConfig();

        Assert.False(result.Enabled);
        Assert.Empty(result.Groups);
    }

    [Fact]
    public void Provider_returns_disabled_when_invalid()
    {
        var provider = new GroupedNavigationConfigProvider(
            new Monitor(() => throw new OptionsValidationException("", typeof(GroupedNavigationOptions), ["bad"])),
            NullLogger<GroupedNavigationConfigProvider>.Instance);

        Assert.False(provider.GetConfig().Enabled);
    }
}
