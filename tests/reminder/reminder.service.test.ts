import test from "node:test";
import assert from "node:assert/strict";
import { ReminderService } from "../../src/modules/reminder/reminder.service";
import { ReminderRepository } from "../../src/modules/reminder/reminder.repository";
import { ReminderProfileWithUser } from "../../src/modules/reminder/reminder.types";

class MockReminderRepository extends ReminderRepository {
    public profile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    override async getOrCreate(waId: string, name?: string): Promise<ReminderProfileWithUser> {
        return this.profile;
    }

    override async updateSettings(
        userId: number,
        data: { enabled?: boolean; breakfastTime?: string; lunchTime?: string; dinnerTime?: string }
    ): Promise<ReminderProfileWithUser> {
        this.profile = { ...this.profile, ...data };
        return this.profile;
    }
}

test("getReminderMessage returns meal-specific reminder message", () => {
    const service = new ReminderService(new MockReminderRepository());
    const bfastMsg = service.getReminderMessage("breakfast", "Alice");
    assert.match(bfastMsg, /breakfast/i);
    assert.match(bfastMsg, /Alice/);

    const lunchMsg = service.getReminderMessage("lunch");
    assert.match(lunchMsg, /lunch/i);

    const dinnerMsg = service.getReminderMessage("dinner");
    assert.match(dinnerMsg, /dinner/i);
});

test("setTime rejects invalid meal name", async () => {
    const service = new ReminderService(new MockReminderRepository());
    const res = await service.setTime("628123456789@c.us", "brunch", "10:00");
    assert.match(res, /invalid meal/i);
});

test("setTime rejects invalid time format", async () => {
    const service = new ReminderService(new MockReminderRepository());
    const res = await service.setTime("628123456789@c.us", "breakfast", "8:00");
    assert.match(res, /invalid time/i);
});

test("setTime successfully updates meal time", async () => {
    const repo = new MockReminderRepository();
    const service = new ReminderService(repo);
    const res = await service.setTime("628123456789@c.us", "breakfast", "07:30");
    assert.match(res, /breakfast/i);
    assert.match(res, /07:30/);
    assert.equal(repo.profile.breakfastTime, "07:30");
});

test("setEnabled toggles active status", async () => {
    const repo = new MockReminderRepository();
    const service = new ReminderService(repo);
    await service.setEnabled("628123456789@c.us", false);
    assert.equal(repo.profile.enabled, false);
    await service.setEnabled("628123456789@c.us", true);
    assert.equal(repo.profile.enabled, true);
});
