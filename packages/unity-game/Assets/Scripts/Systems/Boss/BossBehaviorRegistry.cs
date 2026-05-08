namespace GLD.Systems.Boss
{
    public static class BossBehaviorRegistry
    {
        public static IBossBehavior Create(string behaviorId)
        {
            switch (behaviorId)
            {
                case "orc_warlord":
                    return new OrcWarlordBehavior();
                case "forge_master":
                    return new ForgeMasterBehavior();
                case "corrupted_archmage":
                    return new CorruptedArchmageBehavior();
                case "dragon":
                    return new DragonBehavior();
                default:
                    return null;
            }
        }
    }
}
